export interface PackageData {
  id: number;
  name: string;
  tokens: number;
  price: number;
  popular?: boolean;
}

export const GAME_PACKAGES: PackageData[] = [
  { id: 1, name: "لعبة واحدة", tokens: 1, price: 10 },
  { id: 2, name: "ثلاث ألعاب", tokens: 3, price: 30 },
  { id: 3, name: "خمسة ألعاب", tokens: 5, price: 45, popular: true },
];

export const getPackageById = (id: number): PackageData | undefined => {
  return GAME_PACKAGES.find((pkg) => pkg.id === id);
};
