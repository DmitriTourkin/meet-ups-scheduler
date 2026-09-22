from datetime import datetime


def assert_quantized_15min(value: datetime) -> datetime:
    if value.minute % 15 != 0 or value.second != 0 or value.microsecond != 0:
        raise ValueError("must be aligned to a 15-minute boundary")
    return value
