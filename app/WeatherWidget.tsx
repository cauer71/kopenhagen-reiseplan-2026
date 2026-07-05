"use client";

import { useEffect, useState } from "react";

type WeatherDay = {
  action: string;
  code: number;
  date: string;
  day: string;
  pop: number | null;
  tempMax: number;
  tempMin: number;
  wind: number;
};

type OpenMeteoDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: Array<number | null>;
  wind_speed_10m_max: number[];
};

type OpenMeteoResponse = {
  daily: OpenMeteoDaily;
  daily_units?: Record<string, string>;
  generationtime_ms?: number;
};

const fallback: WeatherDay[] = [
  {
    action: "GoBoat passt, Turm nur bei gutem Wind.",
    code: 3,
    date: "2026-07-06",
    day: "Mo",
    pop: 20,
    tempMax: 20,
    tempMin: 12,
    wind: 18,
  },
  {
    action: "Designmuseum als perfekter Regenblock.",
    code: 61,
    date: "2026-07-07",
    day: "Di",
    pop: 65,
    tempMax: 18,
    tempMin: 13,
    wind: 22,
  },
  {
    action: "Hafenroute gut, Windjacke mitnehmen.",
    code: 2,
    date: "2026-07-08",
    day: "Mi",
    pop: 35,
    tempMax: 21,
    tempMin: 13,
    wind: 31,
  },
  {
    action: "Schöner Abreisetag, genug Flughafenpuffer.",
    code: 1,
    date: "2026-07-09",
    day: "Do",
    pop: 10,
    tempMax: 24,
    tempMin: 12,
    wind: 17,
  },
];

const weekday = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  timeZone: "Europe/Copenhagen",
});

function weatherLabel(code: number) {
  if (code === 0) return "Klar";
  if ([1, 2].includes(code)) return "Heiter";
  if (code === 3) return "Bedeckt";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return "Niesel";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wechselhaft";
}

function planAction(day: WeatherDay) {
  const rainy = day.pop !== null && day.pop >= 55;
  if (rainy) return "Indoor-Blöcke nach vorn ziehen: Museum, CC oder längerer Lunch.";
  if (day.wind >= 30) return "Hafen und CopenHill bleiben stark, aber Windjacke einpacken.";
  if (day.tempMax >= 23) return "Wasserpausen und La-Banchina-Zeit bewusst offen halten.";
  return day.action;
}

function convert(data: OpenMeteoResponse): WeatherDay[] {
  return data.daily.time.map((date, index) => {
    const jsDate = new Date(`${date}T12:00:00+02:00`);
    const day = weekday.format(jsDate).replace(".", "");
    const item: WeatherDay = {
      action: fallback[index]?.action ?? "Route am Vorabend kurz prüfen.",
      code: data.daily.weather_code[index],
      date,
      day,
      pop: data.daily.precipitation_probability_max?.[index] ?? null,
      tempMax: Math.round(data.daily.temperature_2m_max[index]),
      tempMin: Math.round(data.daily.temperature_2m_min[index]),
      wind: Math.round(data.daily.wind_speed_10m_max[index]),
    };
    return { ...item, action: planAction(item) };
  });
}

export default function WeatherWidget() {
  const [days, setDays] = useState<WeatherDay[]>(fallback);
  const [status, setStatus] = useState("Lade aktuelle Prognose ...");
  const [live, setLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: "55.6761",
      longitude: "12.5683",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      timezone: "Europe/Copenhagen",
      start_date: "2026-07-06",
      end_date: "2026-07-09",
    }).toString();

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
        return response.json() as Promise<OpenMeteoResponse>;
      })
      .then((data) => {
        setDays(convert(data));
        setLive(true);
        setStatus(
          `Live geladen: ${new Intl.DateTimeFormat("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date())}`,
        );
      })
      .catch(() => {
        setLive(false);
        setStatus("Fallback-Prognose aktiv. Bei Netz bitte neu laden.");
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="weather-status" data-live={live ? "true" : "false"}>
        <span>{live ? "Live" : "Fallback"}</span>
        {status}
      </div>
      <div className="weather-grid">
        {days.map((item) => (
          <article className="weather-card" key={item.date}>
            <span>{item.day}</span>
            <strong>
              {item.tempMax}/{item.tempMin} °C
            </strong>
            <b>{weatherLabel(item.code)}</b>
            <p>
              {item.pop !== null ? `${item.pop}% Regen · ` : ""}
              Wind {item.wind} km/h
            </p>
            <p>{item.action}</p>
          </article>
        ))}
      </div>
      <a
        className="weather-source"
        href="https://open-meteo.com/"
        rel="noreferrer"
        target="_blank"
      >
        Quelle: Open-Meteo Live Forecast
      </a>
    </>
  );
}
