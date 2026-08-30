type PokerCardProps = {
  value: string;
  suit: string;
};

export function PokerCard({ value, suit }: PokerCardProps) {
  const red = suit === "♥" || suit === "♦";

  return (
    <div className={`card ${red ? "red" : ""}`}>
      <b>{value}</b>
      <span>{suit}</span>
    </div>
  );
}
