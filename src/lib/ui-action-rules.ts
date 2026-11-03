export function canCoverExpense(payerId: string | null, memberId: string | undefined) {
  return !!memberId && payerId === memberId;
}

export function canEditTaskNote(authorId: string, memberId: string | undefined) {
  return !!memberId && authorId === memberId;
}

export function validTaskNote(body: string, mentionCount: number) {
  const length = body.trim().length;
  return length >= 1 && length <= 2000 && mentionCount <= 20;
}
