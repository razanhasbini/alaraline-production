import Crumbs from './Crumbs';

/** The theme's soft pink page header (same as the category pages): big title + breadcrumb under it. */
export default function PageBand({ title, crumbs }: { title: string; crumbs: { label: string; href?: string }[] }) {
  return (
    <header className="cat-head">
      <div className="wrap">
        <h1>{title}</h1>
        <Crumbs items={crumbs} bar={false} />
      </div>
    </header>
  );
}
