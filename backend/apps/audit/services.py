from .models import AuditLog


def catat(*, actor, action, entity="", entity_id="", before=None, after=None, ip=None):
    """Satu-satunya jalur tulis audit log; tidak ada update/delete di API."""
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else "",
        before=before or {},
        after=after or {},
        ip=ip or None,
    )
