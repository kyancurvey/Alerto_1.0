// How a relationship reads on screen. The usual ones are translated; anything else a contact already has is shown as it was entered.
export const relationText = (t, relation) => t(`setup:relations.${relation}`, { defaultValue: relation.charAt(0).toUpperCase() + relation.slice(1) })
