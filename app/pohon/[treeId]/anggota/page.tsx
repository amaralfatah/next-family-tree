import { InviteManager } from "@/components/invite-manager";
import { MemberRow } from "@/components/member-row";
import { listInvitesWith, listMembersWith } from "@/lib/members/service";
import { loadTreeMeta } from "@/lib/tree/context";

export const metadata = { title: "Anggota" };

export default async function MembersPage({ params }: PageProps<"/pohon/[treeId]/anggota">) {
  const { treeId } = await params;
  const { db, user, access, isOwner } = await loadTreeMeta(treeId);
  const [memberList, inviteList] = await Promise.all([listMembersWith(db, access), isOwner ? listInvitesWith(db, access) : Promise.resolve([])]);

  return (
    <main id="konten" className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="font-display text-[2.125rem] leading-tight tracking-[-0.02em]">Anggota</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pemilik mengelola anggota. Editor bisa menambah dan mengubah orang serta relasi. Pembaca hanya melihat.
      </p>

      <ul className="mt-6 divide-y overflow-hidden rounded-xl bg-card">
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
        <p className="mt-6 text-sm text-muted-foreground">Ingin mengundang kerabat lain? Minta pemilik pohon membuat link undangan.</p>
      )}
    </main>
  );
}
