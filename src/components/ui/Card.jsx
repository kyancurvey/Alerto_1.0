export default function Card({ as: Tag = 'div', flush = false, className = '', children, ...rest }) {
  return (
    <Tag className={['card', flush && 'card--flush', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  )
}
