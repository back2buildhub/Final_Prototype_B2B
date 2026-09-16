export function calculateConstructorRating(
  ratings: number[],
  isVerified: boolean
): number {
  const V = isVerified ? 1 : 0

  if (ratings.length === 0) {
    // No owner ratings yet — only verification counts
    return V * 20
  }

  const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  const finalRating = (avgRating * 0.8) + (V * 20)

  return Math.round(finalRating * 10) / 10
}

export function getRatingColor(rating: number): string {
  if (rating >= 80) return '#4ADE80'
  if (rating >= 60) return '#FB923C'
  if (rating >= 40) return '#FCD34D'
  return '#F87171'
}

export function getRatingLabel(rating: number): string {
  if (rating >= 90) return 'Excellent'
  if (rating >= 75) return 'Very Good'
  if (rating >= 60) return 'Good'
  if (rating >= 40) return 'Average'
  if (rating > 0) return 'Below Average'
  return 'Not Rated'
}

export function getRatingDisplay(rating: number, reviewCount: number, isVerified: boolean): string {
  if (reviewCount === 0 && !isVerified) return 'No Rating Yet'
  return `${rating}%`
}
