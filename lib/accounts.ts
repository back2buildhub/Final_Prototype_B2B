// Saves account credentials to localStorage for quick switching
// This is acceptable for a demo project

export interface SavedAccount {
  email: string
  password: string
  name: string
  role: 'property_owner' | 'constructor'
}

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('b2b_saved_accounts')
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

// Save or update an account
export function saveAccount(account: SavedAccount) {
  const accounts = getSavedAccounts()
  const existing = accounts.findIndex(a => a.email === account.email)
  if (existing >= 0) {
    accounts[existing] = account
  } else {
    accounts.push(account)
  }
  localStorage.setItem('b2b_saved_accounts', JSON.stringify(accounts))
}

// Get all accounts except the currently logged-in one
export function getOtherAccounts(currentEmail: string): SavedAccount[] {
  return getSavedAccounts().filter(a => a.email !== currentEmail)
}
