/**
 * Join the complete card summaries and loaded native chat pages for one owner.
 * Keep card order, followed by unmatched chats in their native page order.
 * Both services remain responsible for authorizing the input collections.
 */
export function buildSessionCards(cards, conversations) {
  const chats = new Map(conversations.map(chat => [chat.conversationId, chat]));
  const entries = cards.map(card => {
    const conversationId = card.conversationId;
    if (conversationId === undefined) {
      throw new TypeError('Card summaries must include their conversation binding');
    }
    const conversation = chats.get(conversationId) ?? null;
    chats.delete(conversationId);
    return {key:'card:' + card.id, card, conversationId, conversation};
  });
  for (const [conversationId, conversation] of chats) {
    entries.push({key:'chat:' + conversationId, card:null, conversationId, conversation});
  }
  return entries;
}
