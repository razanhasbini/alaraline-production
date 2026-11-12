import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/admin/session';
import { wp } from '@/lib/admin/wp';
import { saveOrderEmails } from '../../actions';

export const metadata = { title: 'Notifications' };

type Setting = { id: string; value: string };

export default async function Notifications() {
  const s = await requireAdmin();
  const settings = await wp<Setting[]>(s, '/wc/v3/settings/email_new_order');
  const val = (k: string) => settings.find(x => x.id === k)?.value ?? '';
  return (
    <>
      <header className="ad-head"><h1>Notifications</h1><p>Who hears about new orders.</p></header>
      <section className="ad-card">
        <h2>Email for every new order</h2>
        <p className="ad-muted">WooCommerce’s own “New order” email. It includes the items, scents, packaging, customer and address.</p>
        <ActionForm action={saveOrderEmails} className="ad-form">
          <label className="ad-check"><input type="checkbox" name="enabled" defaultChecked={val('enabled') !== 'no'} /> Send the new-order email</label>
          <label>Send to <small>(separate several addresses with commas)</small><input name="recipient" defaultValue={val('recipient')} /></label>
          <Submit>Save</Submit>
        </ActionForm>
      </section>
      <section className="ad-card">
        <h2>WhatsApp message for every new order</h2>
        <p>Not connected yet. Sending WhatsApp messages automatically needs a WhatsApp sending service (for example the official WhatsApp Business Cloud API, or Twilio). Once one is chosen, each new order will send a short message (order number, items, total, customer phone) to the numbers you choose here.</p>
        <p className="ad-muted">Customers can already message you from the WhatsApp button on every page, and each order page here has a one-tap “WhatsApp” link to the customer.</p>
      </section>
      <p className="ad-hint">The emails customers get (order received, completed…) are still sent by WooCommerce automatically, exactly as before.</p>
    </>
  );
}
