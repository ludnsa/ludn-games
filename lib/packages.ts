export interface PackageData {
  id: number;
  name: string;
  tokens: number;
  price: number;
  popular?: boolean;
}

export const GAME_PACKAGES: PackageData[] = [
  { id: 1, name: "لعبة واحدة", tokens: 1, price: 11.5 },
  { id: 2, name: "ثلاث ألعاب", tokens: 3, price: 34.5 },
  { id: 3, name: "ست ألعاب", tokens: 6, price: 65.0, popular: true },
  { id: 4, name: "عشر ألعاب", tokens: 10, price: 115.0 },
];

export const getPackageById = (id: number): PackageData | undefined => {
  return GAME_PACKAGES.find((pkg) => pkg.id === id);
};
