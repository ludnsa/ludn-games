import { useState } from "react";
import { WDCountry } from "@/types";

export function useWDCountries() {
  const [dbCountries, setDbCountries] = useState<WDCountry[]>([]);
  const [dbWdChallenges, setDbWdChallenges] = useState<string[]>([]);
  const [countriesLimit, setCountriesLimit] = useState<number>(20);
  const [challengesCount, setChallengesCount] = useState<number>(2);
  const [countries, setCountries] = useState<WDCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [mapPosition, setMapPosition] = useState({
    center: [0, 0] as [number, number],
    zoom: 1,
    name: "العالم",
  });
  const [capitals, setCapitals] = useState<{
    team1: string | null;
    team2: string | null;
  }>({ team1: null, team2: null });
  const [stolenCapitalAlert, setStolenCapitalAlert] = useState<{
    winner: 1 | 2;
    loser: 1 | 2;
    points: number;
    countryName: string;
  } | null>(null);

  const countriesLeft = countries.filter((c) => c.owner === null).length;
  const team1Owned = countries.filter((c) => c.owner === 1).length;
  const team2Owned = countries.filter((c) => c.owner === 2).length;

  return {
    dbCountries, setDbCountries,
    dbWdChallenges, setDbWdChallenges,
    countriesLimit, setCountriesLimit,
    challengesCount, setChallengesCount,
    countries, setCountries,
    selectedCountry, setSelectedCountry,
    mapPosition, setMapPosition,
    capitals, setCapitals,
    stolenCapitalAlert, setStolenCapitalAlert,
    countriesLeft, team1Owned, team2Owned
  };
}
