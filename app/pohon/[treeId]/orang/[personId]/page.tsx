import { AlertTriangleIcon, ChevronRightIcon, NetworkIcon, PencilIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addRow } from "@/components/form-row-classes";
import { FormGroup, InfoRow } from "@/components/form-rows";
import { BackLink, Page } from "@/components/page-shell";
import { LinkMeButton } from "@/components/link-me-button";
import { PersonAvatar } from "@/components/person-avatar";
import { PhotoUploader } from "@/components/photo-uploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChildLinkMenu, UnionEditor } from "@/components/union-editor";
import { formatPartialDate } from "@/lib/dates";
import { describeKinship } from "@/lib/kinship";
import { CHILD_RELATION_LABEL, deceasedMark, GENDER_LABEL, subtitle, UNION_STATUS_LABEL } from "@/lib/person";
import { loadTreeContext } from "@/lib/tree/context";
import { familyOf } from "@/lib/tree/family";
import { dateWarnings } from "@/lib/tree/validate";
import type { Person } from "@/lib/types";

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

  const parentsLabel = (relation: string) => `Orang tua ${relation !== "biological" ? CHILD_RELATION_LABEL[relation as keyof typeof CHILD_RELATION_LABEL].toLowerCase() : "kandung"}`;

  // Laid out like a contact in Contacts: who they are at the top, then grouped rows (facts, family, the
  // one destructive action last), all on the grouped background with no card inside a card.
  return (
    <Page className="pt-4">
      <BackLink href={`${base}/daftar`} label="Daftar" />

      <header className="mt-2 grid justify-items-center gap-3 text-center">
        <PersonAvatar treeId={treeId} person={person} size="lg" />
        {canEdit ? <PhotoUploader treeId={treeId} personId={personId} hasPhoto={Boolean(person.photoKey)} /> : null}
        <div>
          {deceasedMark(person) ? <p className="text-sm text-muted-foreground">{deceasedMark(person)}</p> : null}
          <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em] text-balance sm:text-[2.5rem]">{person.fullName}</h1>
          {person.nickname ? <p className="mt-0.5 text-[17px] text-muted-foreground">“{person.nickname}”</p> : null}
        </div>
        {/* Quick actions under the name, as the message/call buttons in Contacts. */}
        <div className="mt-1 flex gap-2">
          <QuickAction href={`${base}?pusat=${personId}`} icon={NetworkIcon} label="Lihat di pohon" />
          {canEdit ? <QuickAction href={`${base}/orang/${personId}/ubah`} icon={PencilIcon} label="Ubah" /> : null}
        </div>
      </header>

      <div className="mt-8 grid gap-6">
        {person.id === mePersonId ? (
          <FormGroup footer="Akun Anda tertaut ke orang ini, jadi hubungan dengan setiap kerabat dihitung dari sini.">
            <InfoRow label="Ini Anda">
              <span className="font-medium">Akun Anda</span>
            </InfoRow>
            <LinkMeButton treeId={treeId} personId={personId} unlink row />
          </FormGroup>
        ) : kin ? (
          <FormGroup>
            <div className="px-4 py-3">
              <p className="text-[13px] text-muted-foreground">Hubungan dengan Anda</p>
              <p className="font-display text-2xl leading-tight">{kin.label}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {kin.path.map((id, i) => (
                  <span key={`${id}-${i}`}>
                    {i > 0 ? " → " : null}
                    {i === 0 ? "Anda" : (
                      <Link href={`${base}/orang/${id}`} className="text-soga-ink hover:opacity-80">
                        {byId.get(id)?.nickname || byId.get(id)?.fullName}
                      </Link>
                    )}
                  </span>
                ))}
              </p>
            </div>
          </FormGroup>
        ) : mePersonId ? (
          <p className="px-4 text-[13px] text-muted-foreground">Belum ditemukan hubungan dengan Anda di pohon ini.</p>
        ) : (
          <FormGroup footer="Tandai diri Anda agar hubungan dengan setiap kerabat terlihat.">
            <LinkMeButton treeId={treeId} personId={personId} row />
          </FormGroup>
        )}

        <FormGroup>
          <InfoRow label="Jenis kelamin">{GENDER_LABEL[person.gender]}</InfoRow>
          <InfoRow label="Tanggal lahir">{born ?? "Tidak diketahui"}</InfoRow>
          {person.birthPlace ? <InfoRow label="Tempat lahir">{person.birthPlace}</InfoRow> : null}
          <InfoRow label="Status">{person.isLiving ? "Masih hidup" : died ? `Wafat ${died}` : "Sudah wafat"}</InfoRow>
        </FormGroup>

        {person.notes ? (
          <FormGroup title="Catatan">
            <p className="px-4 py-3 text-[15px] whitespace-pre-line">{person.notes}</p>
          </FormGroup>
        ) : null}

        {warnings.length > 0 ? (
          <Alert variant="warning">
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

        {parentGroups.length === 0 ? (
          <FormGroup title="Orang tua">
            <p className="px-4 py-3 text-[15px] text-muted-foreground">Orang tua belum dicatat.</p>
            {canEdit ? <AddRow href={addHref("parent")}>Tambah orang tua</AddRow> : null}
          </FormGroup>
        ) : (
          parentGroups.map((g) => (
            <div key={g.union.id} className="grid gap-6">
              <FormGroup title={parentsLabel(g.relation)}>
                {g.parents.map((p) => (
                  <PersonRow key={p.id} treeId={treeId} person={p} />
                ))}
                {g.parents.length < 2 ? (
                  canEdit ? (
                    <AddRow href={addHref("parent", `&rel_anak=${g.relation}`)}>Tambah orang tua lain</AddRow>
                  ) : (
                    <p className="px-4 py-3 text-[15px] text-muted-foreground">Orang tua lain tidak diketahui</p>
                  )
                ) : null}
              </FormGroup>
              {g.siblings.length > 0 || (canEdit && g.relation === "biological") ? (
                <FormGroup title={g.siblings.length > 0 ? `Saudara (${g.siblings.length})` : "Saudara"}>
                  {g.siblings.map((sib) => (
                    <PersonRow key={sib.person.id} treeId={treeId} person={sib.person} note={sib.relation !== "biological" ? CHILD_RELATION_LABEL[sib.relation] : undefined} />
                  ))}
                  {canEdit && g.relation === "biological" ? <AddRow href={addHref("sibling")}>Tambah saudara</AddRow> : null}
                </FormGroup>
              ) : null}
            </div>
          ))
        )}

        {own.map((o, i) => (
          <div key={o.union.id} className="grid gap-6">
            <FormGroup
              title={[own.length > 1 ? `Pernikahan ke-${i + 1}` : null, UNION_STATUS_LABEL[o.union.status], o.union.startDate ? formatPartialDate(o.union.startDate, "day") : null].filter(Boolean).join(" · ")}
            >
              {o.partner ? <PersonRow treeId={treeId} person={o.partner} /> : <p className="px-4 py-3 text-[15px] text-muted-foreground">Pasangan tidak diketahui</p>}
              {canEdit ? <UnionEditor treeId={treeId} union={o.union} partnerName={o.partner?.fullName ?? null} row /> : null}
            </FormGroup>
            <FormGroup title={`Anak (${o.children.length})`}>
              {o.children.length === 0 ? <p className="px-4 py-3 text-[15px] text-muted-foreground">Belum ada anak dicatat.</p> : null}
              {o.children.map((c) => (
                <PersonRow
                  key={c.person.id}
                  treeId={treeId}
                  person={c.person}
                  note={c.relation !== "biological" ? `Anak ${CHILD_RELATION_LABEL[c.relation].toLowerCase()}` : c.birthOrder ? `Anak ke-${c.birthOrder}` : undefined}
                  menu={canEdit ? <ChildLinkMenu treeId={treeId} unionId={o.union.id} childId={c.person.id} childName={c.person.fullName} relation={c.relation} birthOrder={c.birthOrder} /> : null}
                />
              ))}
              {canEdit ? <AddRow href={addHref("child", `&ikatan=${o.union.id}`)}>Tambah anak</AddRow> : null}
            </FormGroup>
          </div>
        ))}

        {own.length === 0 || canEdit ? (
          <FormGroup title={own.length === 0 ? "Pasangan & anak" : undefined}>
            {own.length === 0 ? <p className="px-4 py-3 text-[15px] text-muted-foreground">Belum ada pasangan atau anak yang dicatat.</p> : null}
            {canEdit ? <AddRow href={addHref("partner")}>Tambah pasangan</AddRow> : null}
            {canEdit && own.length === 0 ? <AddRow href={addHref("child")}>Tambah anak (pasangan tidak diketahui)</AddRow> : null}
          </FormGroup>
        ) : null}

      </div>
    </Page>
  );
}

/** A square button under the name, icon over label, as the quick actions of a contact. */
function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="grid min-w-24 justify-items-center gap-1 rounded-xl bg-card px-4 py-2.5 text-[13px] font-medium text-soga-ink outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted active:duration-0"
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function AddRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={addRow}>
      <PlusIcon className="size-[18px]" /> {children}
    </Link>
  );
}

/** One person in a group: the whole row opens them (a list row on iOS); a menu, when there is one, sits above that. */
function PersonRow({ treeId, person, note, menu }: { treeId: string; person: Person; note?: string; menu?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-14 items-center gap-3 px-4 transition-colors duration-150 hover:bg-muted/50 has-[a:active]:bg-muted has-[a:active]:duration-0 has-[a:focus-visible]:bg-accent/40">
      <PersonAvatar treeId={treeId} person={person} size="sm" />
      <Link href={`/pohon/${treeId}/orang/${person.id}`} className="min-w-0 flex-1 py-2 outline-none after:absolute after:inset-0 after:content-['']">
        <span className="block truncate text-[15px] font-medium">{person.fullName}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{[note, subtitle(person)].filter(Boolean).join(" · ") || "—"}</span>
      </Link>
      {menu ? <span className="relative z-10">{menu}</span> : <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />}
    </div>
  );
}
