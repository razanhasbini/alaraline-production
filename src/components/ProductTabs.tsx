'use client';

import { useState, type ReactNode } from 'react';

// The theme's "product tabs" widget: big Butler titles, the active one black with the pink squiggle.
// All tab contents are rendered on the server; this only switches which one is visible.
export default function ProductTabs({ titles, panels, id }: { titles: string[]; panels: ReactNode[]; id: string }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="ptabs" role={titles.length > 1 ? 'tablist' : undefined}>
        {titles.map((t, i) => titles.length > 1
          ? <button key={t} id={`${id}-tab-${i}`} role="tab" type="button" aria-selected={i === active} aria-controls={`${id}-panel-${i}`} onClick={() => setActive(i)}>{t}</button>
          : <h2 key={t} className="ptabs-one">{t}</h2>)}
      </div>
      {panels.map((panel, i) => (
        <div key={i} id={`${id}-panel-${i}`} role={titles.length > 1 ? 'tabpanel' : undefined} aria-labelledby={titles.length > 1 ? `${id}-tab-${i}` : undefined} hidden={i !== active}>
          {panel}
        </div>
      ))}
    </>
  );
}
