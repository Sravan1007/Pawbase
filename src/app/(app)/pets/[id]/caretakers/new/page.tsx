import { inviteCaretaker } from "./actions";

export default async function InviteCaretakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const action = inviteCaretaker.bind(null, id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="page-title">Invite a caretaker</h1>
        <p className="page-subtitle">
          They need an existing Pet Passport account. Enter the email they signed up with.
        </p>
      </div>
      <form action={action} className="card flex flex-col gap-4">
        <label className="field-label">
          Email
          <input name="email" type="email" required placeholder="them@example.com" className="input" />
        </label>
        <label className="field-label">
          Role
          <select name="role" defaultValue="caretaker" className="input">
            <option value="caretaker">Caretaker</option>
            <option value="secondary_contact">Secondary contact</option>
            <option value="vet">Vet</option>
          </select>
        </label>
        <div className="flex flex-col gap-2 text-sm text-stone-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="can_confirm_medication" />
            Can confirm medication given
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="finder_may_call" />
            Finder may call (shown on public QR page)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="vet_may_call" />
            Vet may call (shown on public QR page)
          </label>
        </div>
        <button type="submit" className="btn-primary self-start">
          Add access
        </button>
      </form>
    </div>
  );
}
