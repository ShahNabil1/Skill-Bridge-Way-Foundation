ALTER FUNCTION public.all_permission_keys() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_permissions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_activity_report(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_activity_report(uuid, timestamptz, timestamptz) TO authenticated, service_role;