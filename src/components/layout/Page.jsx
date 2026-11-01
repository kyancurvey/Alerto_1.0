export default function Page({ title, children }) {
  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>
      {children}
    </div>
  )
}
