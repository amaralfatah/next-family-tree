import { InviteManager } from "@/components/invite-manager";
import { Page, PageTitle } from "@/components/page-shell";
import { MemberRow } from "@/components/member-row";
import { listInvitesWith, listMembersWith } from "@/lib/members/service";
import { loadTreeMeta } from "@/lib/tree/context";

export const metadata = { title: "Anggota" };

export default async function MembersPage({ params }: PageProps<"/pohon/[treeId]/anggota">) {
  const { treeId } = await params;
  const { db, user, access, isOwner } = await loadTreeMeta(treeId);
  const [memberList, inviteList] = await Promise.all([listMembersWith(db, access), isOwner ? listInvitesWith(db, access) : Promise.resolve([])]);

  return (
    <Page className="grid gap-8">
      <PageTitle title="Anggota" subtitle="Pemilik mengelola anggota. Editor bisa menambah dan mengubah orang serta hubungan keluarga. Pembaca hanya melihat." />

      <ul className="divide-y divide-border/70 overflow-hidden rounded-xl bg-card">
        {memberList.map((m) => (
          <MemberRow
            key={m.userId}
            treeId={treeId}
            member={{ userId: m.userId, name: m.name, email: m.email, image: m.image, role: m.role, personName: m.personName }}
            isSelf={m.userId === user.id}
            canManage={isOwner}
          />
        ))}
      </ul>

      {isOwner ? (
        <InviteManager
          treeId={treeId}
          invites={inviteList.map((i) => ({
            id: i.id,
            role: i.role,
            expiresAt: i.expiresAt.toISOString(),
            state: i.state,
          }))}
        />
      ) : (
        <p className="px-4 text-[13px] text-muted-foreground">Ingin mengundang kerabat lain? Minta pemilik pohon membuat link undangan.</p>
      )}
    </Page>
  );
}
