import Link from 'next/link';

// The theme's breadcrumb: "Home — Products — Category — Product", separated by short lines.
export default function Crumbs({ items, bar = true }: { items: { label: string; href?: string }[]; bar?: boolean }) {
  return (
    <nav className={bar ? 'crumb-bar' : 'crumbs-inline'} aria-label="Breadcrumb">
      <ol className={bar ? 'wrap crumbs' : 'crumbs'}>
        {items.map((c, i) => (
          <li key={i}>
            {c.href && i < items.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
