from datetime import date, datetime
from decimal import Decimal

from .models import AuditLog


def _json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def record_audit(actor, action, entity_type, entity_id, summary, changes=None):
    return AuditLog.objects.create(
        actor=actor if getattr(actor, 'is_authenticated', False) else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        summary=summary,
        changes={
            field: {
                'before': _json_value(values.get('before')),
                'after': _json_value(values.get('after')),
            }
            for field, values in (changes or {}).items()
        },
    )
