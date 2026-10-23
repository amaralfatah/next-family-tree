import { AlertTriangleIcon, MapPinIcon, NetworkIcon, PencilIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePersonButton } from "@/components/delete-person-button";
import { LinkMeButton } from "@/components/link-me-button";
import { PersonAvatar } from "@/components/person-avatar";
import { PhotoUploader } from "@/components/photo-uploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { ChildLinkMenu, UnionEditor } from "@/components/union-editor";
import { formatPartialDate } from "@/lib/dates";
import { describeKinship } from "@/lib/kinship";
import { CHILD_RELATION_LABEL, deceasedMark, GENDER_LABEL, subtitle, UNION_STATUS_LABEL } from "@/lib/person";
import { loadTreeContext } from "@/lib/tree/context";
import { familyOf } from "@/lib/tree/family";
import { dateWarnings } from "@/lib/tree/validate";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pohon/[treeId]/orang/[personId]">) {
  const { treeId, personId } = await params;
  const { data } = await loadTreeContext(treeId);
  return { title: data.persons.find((p) => p.id === personId)?.fullName ?? "Orang" };
}

export default async function PersonPage({ params }: PageProps<"/pohon/[treeId]/orang/[personId]">) {
  const { treeId, personId } = await params;
  const { data, mePersonId, canEdit } = await loadTreeContext(treeId);
  const person = data.persons.find((p) => p.id === personId);
  if (!person) notFound();

  const byId = new Map(data.persons.map((p) => [p.id, p]));
  const { parentGroups, own } = familyOf(data, personId);
  const warnings = dateWarnings(data, personId);
  const kin = mePersonId && mePersonId !== personId ? describeKinship(data, mePersonId, personId) : null;
  const born = formatPartialDate(person.birthDate, person.birthPrecision);
  const died = formatPartialDate(person.deathDate, person.deathPrecision);
  const base = `/pohon/${treeId}`;
  const addHref = (rel: string, extra = "") => `${base}/orang/baru?rel=${rel}&dari=${personId}${extra}`;
  const hasBioParents = parentGroups.some((g) => g.relation === "biological");

  return (
    <main id="konten" className="mx-auto w-full max-w-5xl px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href={`${base}/daftar`} className="hover:text-foreground">
          Daftar
        </Link>{" "}
        / <span className="text-foreground">{person.fullName}</span>
      </nav>

      <section className="mt-5 grid gap-6 rounded-2xl bg-card p-5 sm:grid-cols-[auto_1fr] sm:p-7">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <PersonAvatar treeId={treeId} person={person} size="lg" />
          {canEdit ? <PhotoUploader treeId={treeId} personId={personId} hasPhoto={Boolean(person.photoKey)} /> : null}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {deceasedMark(person) ? <p className="text-sm text-muted-foreground">{deceasedMark(person)}</p> : null}
              <h1 className="font-display text-4xl leading-tight text-balance sm:text-5xl">{person.fullName}</h1>
              {person.nickname ? <p className="mt-1 text-lg text-muted-foreground">“{person.nickname}”</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`${base}?pusat=${personId}`} className={buttonVariants({ variant: "outline" })}>
                <NetworkIcon data-icon="inline-start" /> Lihat di bagan
              </Link>
              {canEdit ? (
                <Link href={`${base}/orang/${personId}/ubah`} className={buttonVariants({ variant: "outline" })}>
                  <PencilIcon data-icon="inline-start" /> Ubah
                </Link>
              ) : null}
            </div>
          </div>

          {person.id === mePersonId ? (
            <p className="mt-4 inline-flex items-center gap-3 rounded-full bg-accent px-3 py-1 text-sm">
              <span className="font-medium text-soga-ink">Ini Anda</span>
              <LinkMeButton treeId={treeId} personId={personId} unlink />
            </p>
          ) : kin ? (
            <div className="mt-4 rounded-xl bg-accent/70 px-4 py-3">
              <p className="text-sm text-muted-foreground">Hubungan dengan Anda</p>
              <p className="font-display text-2xl text-soga-ink">{kin.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {kin.path.map((id, i) => (
                  <span key={`${id}-${i}`}>
                    {i > 0 ? " → " : null}
                    {i === 0 ? "Anda" : <Link href={`${base}/orang/${id}`} className="underline-offset-2 hover:underline">{byId.get(id)?.nickname || byId.get(id)?.fullName}</Link>}
                  </span>
                ))}
              </p>
            </div>
          ) : mePersonId ? (
            <p className="mt-4 text-sm text-muted-foreground">Belum ditemukan hubungan dengan Anda di pohon ini.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              Apakah ini Anda? <LinkMeButton treeId={treeId} personId={personId} />
            </div>
          )}

          <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Fact label="Jenis kelamin" value={GENDER_LABEL[person.gender]} />
            <Fact label="Lahir" value={[born ?? "Tidak diketahui", person.birthPlace].filter(Boolean).join(", ")} icon={person.birthPlace ? <MapPinIcon className="size-3.5" /> : null} />
            <Fact label="Status" value={person.isLiving ? "Masih hidup" : died ? `Wafat ${died}` : "Sudah wafat"} />
          </dl>
          {person.notes ? <p className="mt-5 max-w-prose text-sm whitespace-pre-line">{person.notes}</p> : null}

          {warnings.length > 0 ? (
            <Alert variant="warning" className="mt-5">
              <AlertTriangleIcon />
              <AlertDescription className="text-foreground">
                <ul className="flex flex-col gap-1">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Section
          title="Orang tua & saudara"
          action={
            canEdit ? (
              <div className="flex flex-wrap gap-1.5">
                <AddLink href={addHref("parent")}>Ayah/ibu</AddLink>
                {hasBioParents ? <AddLink href={addHref("sibling")}>Saudara</AddLink> : null}
              </div>
            ) : null
          }
        >
          {parentGroups.length === 0 ? (
            <Empty>Orang tua belum dicatat.</Empty>
          ) : (
            parentGroups.map((g) => (
              <div key={g.union.id} className="flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 text-[13px] text-muted-foreground">
                    Orang tua {g.relation !== "biological" ? CHILD_RELATION_LABEL[g.relation].toLowerCase() : "kandung"}
                  </p>
                  <div className="flex flex-col divide-y">
                    {g.parents.map((p) => (
                      <PersonRow key={p.id} treeId={treeId} person={p} />
                    ))}
                    {g.parents.length < 2 ? (
                      canEdit ? (
                        <Link href={addHref("parent", `&rel_anak=${g.relation}`)} className="flex min-h-11 items-center gap-2.5 text-sm text-primary">
                          <PlusIcon className="size-4" /> Tambah orang tua lain
                        </Link>
                      ) : (
                        <span className="flex min-h-11 items-center text-sm text-muted-foreground">Orang tua lain tidak diketahui</span>
                      )
                    ) : null}
                  </div>
                </div>
                {g.siblings.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[13px] text-muted-foreground">Saudara</p>
                    <div className="flex flex-col divide-y">
                      {g.siblings.map((s) => (
                        <PersonRow key={s.person.id} treeId={treeId} person={s.person} note={s.relation !== "biological" ? CHILD_RELATION_LABEL[s.relation] : undefined} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </Section>

        <Section title="Pasangan & anak" action={canEdit ? <AddLink href={addHref("partner")}>Pasangan</AddLink> : null}>
          {own.length === 0 ? (
            <Empty>Belum ada pasangan atau anak yang dicatat.</Empty>
          ) : (
            own.map((o, i) => (
              <div key={o.union.id} className={cn("flex flex-col gap-3", i > 0 && "border-t pt-4")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] text-muted-foreground">
                    {own.length > 1 ? `Ikatan ke-${i + 1} · ` : ""}
                    {UNION_STATUS_LABEL[o.union.status]}
                    {o.union.startDate ? ` · ${formatPartialDate(o.union.startDate, "day")}` : ""}
                  </p>
                  {canEdit ? <UnionEditor treeId={treeId} union={o.union} partnerName={o.partner?.fullName ?? null} /> : null}
                </div>
                {o.partner ? (
                  <PersonRow treeId={treeId} person={o.partner} />
                ) : (
                  <p className="text-sm text-muted-foreground">Pasangan tidak diketahui</p>
                )}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[13px] text-muted-foreground">Anak ({o.children.length})</p>
                    {canEdit ? <AddLink href={addHref("child", `&ikatan=${o.union.id}`)}>Anak</AddLink> : null}
                  </div>
                  {o.children.length === 0 ? (
                    <Empty>Belum ada anak dicatat.</Empty>
                  ) : (
                    <div className="flex flex-col divide-y">
                      {o.children.map((c) => (
                        <PersonRow
                          key={c.person.id}
                          treeId={treeId}
                          person={c.person}
                          note={c.relation !== "biological" ? `Anak ${CHILD_RELATION_LABEL[c.relation].toLowerCase()}` : c.birthOrder ? `Anak ke-${c.birthOrder}` : undefined}
                          menu={canEdit ? <ChildLinkMenu treeId={treeId} unionId={o.union.id} childId={c.person.id} childName={c.person.fullName} relation={c.relation} birthOrder={c.birthOrder} /> : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {canEdit && own.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              <AddLink href={addHref("child")}>Anak (pasangan tidak diketahui)</AddLink>
            </div>
          ) : null}
        </Section>
      </div>

      {canEdit ? (
        <div className="mt-10 flex justify-end border-t pt-6">
          <DeletePersonButton treeId={treeId} personId={personId} name={person.fullName} />
        </div>
      ) : null}
    </main>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 font-medium">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-primary hover:text-primary" })}>
      <PlusIcon data-icon="inline-start" /> {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** A plain row; its list draws hairlines between rows, as in an inset grouped list, so people read as content rather than boxes. */
function PersonRow({ treeId, person, note, menu }: { treeId: string; person: Person; note?: string; menu?: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 transition-colors hover:bg-muted/50">
      <PersonAvatar treeId={treeId} person={person} size="sm" />
      <Link href={`/pohon/${treeId}/orang/${person.id}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{person.fullName}</span>
        <span className="block truncate text-xs text-muted-foreground">{[note, subtitle(person)].filter(Boolean).join(" · ") || "—"}</span>
      </Link>
      {menu}
    </div>
  );
}
