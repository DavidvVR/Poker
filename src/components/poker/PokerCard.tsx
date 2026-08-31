type PokerCardProps = {
  value: string;
  suit: string;
};

export function PokerCard({ value, suit }: PokerCardProps) {
  const red = suit === "♥" || suit === "♦";
  const displayValue = value === "T" ? "10" : value;

  return (
    <div className={`card ${red ? "red" : ""}`}>
      <b>{displayValue}</b>
      <span>{suit}</span>
    </div>
  );
}
