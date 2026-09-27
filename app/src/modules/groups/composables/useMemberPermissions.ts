import { computed, type Ref } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { useGroupSettingsAccess } from '@/modules/groups/composables/useGroupSettingsAccess';
import type { GroupMember, MemberRole } from '@/modules/groups/types';

/** Highest rank first; mirrors the backend's `MemberRole` ordering. */
export const MEMBER_ROLES: readonly MemberRole[] = [
  'owner',
  'admin',
  'moderator',
  'user',
];

function ranksBelow(role: MemberRole, other: MemberRole): boolean {
  return MEMBER_ROLES.indexOf(role) > MEMBER_ROLES.indexOf(other);
}

/**
 * Mirrors `server/src/group/member_policy.rs`: members act only on people
 * strictly below them and hand out only roles below their own, while owner
 * rights (owner and superadmins) cover everyone except the owner's own seat.
 */
export function useMemberPermissions(members: Ref<GroupMember[]>) {
  const { checkPermission } = useAppAuth();
  const userStore = useUserStore();
  const { hasOwnerRights } = useGroupSettingsAccess();

  const canModerateMembers = computed(() =>
    checkPermission('moderate_members'),
  );

  const actorRole = computed<MemberRole>(
    () =>
      members.value.find((m) => m.userId === userStore.user?.id)?.role ??
      'user',
  );

  function isSelf(member: GroupMember): boolean {
    return member.userId === userStore.user?.id;
  }

  function canAssign(member: GroupMember, role: MemberRole): boolean {
    if (member.role === 'owner') return false;
    if (hasOwnerRights.value) return true;
    if (role === 'owner') return false;
    if (isSelf(member)) return ranksBelow(role, actorRole.value);
    return (
      canModerateMembers.value &&
      ranksBelow(member.role, actorRole.value) &&
      ranksBelow(role, actorRole.value)
    );
  }

  function canEditRole(member: GroupMember): boolean {
    return MEMBER_ROLES.some(
      (role) => role !== member.role && canAssign(member, role),
    );
  }

  function canRemove(member: GroupMember): boolean {
    if (isSelf(member) || member.role === 'owner') return false;
    if (hasOwnerRights.value) return true;
    return canModerateMembers.value && ranksBelow(member.role, actorRole.value);
  }

  return {
    canModerateMembers,
    hasOwnerRights,
    isSelf,
    canAssign,
    canEditRole,
    canRemove,
  };
}
