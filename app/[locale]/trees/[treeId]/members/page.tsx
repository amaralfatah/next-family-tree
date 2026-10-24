import { getTranslations } from "next-intl/server";
import { InviteManager } from "@/components/invite-manager";
import { Page, PageTitle } from "@/components/page-shell";
import { MemberRow } from "@/components/member-row";
import { listInvitesWith, listMembersWith } from "@/lib/members/service";
import { loadTreeMeta } from "@/lib/tree/context";

export async function generateMetadata({ params }: PageProps<"/[locale]/trees/[treeId]/members">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trees" });
  return { title: t("members.metaTitle") };
}

export default async function MembersPage({ params }: PageProps<"/[locale]/trees/[treeId]/members">) {
  const { treeId } = await params;
  const t = await getTranslations("trees");
  const { db, user, access, isOwner } = await loadTreeMeta(treeId);
  const [memberList, inviteList] = await Promise.all([listMembersWith(db, access), isOwner ? listInvitesWith(db, access) : Promise.resolve([])]);

  return (
    <Page className="grid gap-8">
      <PageTitle title={t("members.title")} subtitle={t("members.subtitle")} />

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
        <p className="px-4 text-[13px] text-muted-foreground">{t("members.inviteHint")}</p>
      )}
    </Page>
  );
}
