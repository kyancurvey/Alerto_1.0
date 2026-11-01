// The Reset data entry, shared by every screen's gear panel.
export const dataSection = (t, actions) => ({
  id: 'data',
  title: t('data.title'),
  layout: 'list',
  items: [{ id: 'reset', label: t('data.reset'), confirm: t('data.resetConfirm'), danger: true, closeOnSelect: true, onSelect: () => actions.resetData() }],
})
