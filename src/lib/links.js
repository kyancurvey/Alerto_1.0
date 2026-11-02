// The link a driver shares with a family member. It opens the join screen with the code filled in.
export const inviteLink = (code) => `${window.location.origin}${import.meta.env.BASE_URL}#/join/${code}`
