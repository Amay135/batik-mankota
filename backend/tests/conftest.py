import pytest
from django.core.management import call_command
from rest_framework.test import APIClient


@pytest.fixture
def seeded(db):
    call_command("seed_demo")


@pytest.fixture
def client_login(seeded):
    c = APIClient()
    assert c.login(username="rina.wulandari@email.com", password="mankota123")
    return c
