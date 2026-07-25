import { useState } from "react";

export function useWDCards() {
  const [cards1, setCards1] = useState({
    capture: 3,
    protect: 3,
    airStrike: 3,
    capitalCapture: 2,
    spy: 2,
    nuke: 1,
  });
  const [cards2, setCards2] = useState({
    capture: 3,
    protect: 3,
    airStrike: 3,
    capitalCapture: 2,
    spy: 2,
    nuke: 1,
  });
  const [protectedCountries, setProtectedCountries] = useState<Record<string, 1 | 2>>({});
  const [spiedCountryId, setSpiedCountryId] = useState<string | null>(null);

  const deductCard = (team: 1 | 2, cardType: keyof typeof cards1) => {
    if (team === 1) {
      setCards1(prev => ({ ...prev, [cardType]: prev[cardType] - 1 }));
    } else {
      setCards2(prev => ({ ...prev, [cardType]: prev[cardType] - 1 }));
    }
  };

  return {
    cards1, setCards1,
    cards2, setCards2,
    protectedCountries, setProtectedCountries,
    spiedCountryId, setSpiedCountryId,
    deductCard
  };
}
