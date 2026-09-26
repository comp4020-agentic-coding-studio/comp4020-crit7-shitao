// A grid cell's identity is its data-room/data-slot values, not their order
// or adjacency in the markup — matching them as independent lookaheads means
// a cosmetic change (reordering attributes, inserting a new one between
// them) can't break a test whose actual contract is "this room/slot's cell,"
// not "these two attributes sit next to each other in this order."
export function cellTagSource(dataRoom: string, dataSlot: string): string {
  return `<td(?=[^>]*data-room="${dataRoom}")(?=[^>]*data-slot="${dataSlot}")[^>]*>`;
}

// /mine/'s row links the date, then separately shows the slot — the
// contract is "this row names this date next to this slot," not the literal
// punctuation joining them, so a wrapper element around the slot (for
// styling, say) can't break the match.
export function bookingRow(date: string, slot: string): RegExp {
  return new RegExp(`>${date}</a>[\\s\\S]{0,40}?${slot}`);
}
