"""Neo Cloud - Custom component for Neo Domotique fleet management."""

import logging
import asyncio
from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.event import async_track_time_interval

_LOGGER = logging.getLogger(__name__)

DOMAIN = "neo_cloud"
SCAN_INTERVAL = timedelta(minutes=5)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up Neo Cloud component from configuration.yaml."""
    hass.data[DOMAIN] = {
        "connected": False,
        "backend_url": config.get(DOMAIN, {}).get("backend_url", ""),
        "tenant_id": config.get(DOMAIN, {}).get("tenant_id", ""),
        "api_key": config.get(DOMAIN, {}).get("api_key", ""),
    }

    async def _send_heartbeat(now=None):
        """Send heartbeat telemetry to Neo backend."""
        try:
            import aiohttp

            data = hass.data[DOMAIN]
            if not data.get("backend_url") or not data.get("tenant_id"):
                return

            payload = {
                "tenant_id": data["tenant_id"],
                "status": "online",
                "version": hass.config.version,
                "entity_count": len(hass.states.async_all()),
                "automation_count": len(
                    [s for s in hass.states.async_all() if s.domain == "automation"]
                ),
                "uptime_seconds": int(
                    (asyncio.get_event_loop().time())
                ),
            }

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {data['api_key']}",
                    "Content-Type": "application/json",
                }
                async with session.post(
                    f"{data['backend_url']}/api/cloud-instances/heartbeat",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        if not data["connected"]:
                            _LOGGER.info("Neo Cloud: connected to backend")
                            data["connected"] = True
                    else:
                        _LOGGER.warning(
                            "Neo Cloud heartbeat failed: %s", resp.status
                        )
                        data["connected"] = False

        except Exception as err:
            _LOGGER.warning("Neo Cloud heartbeat error: %s", err)
            hass.data[DOMAIN]["connected"] = False

    # Send heartbeat every 5 minutes
    async_track_time_interval(hass, _send_heartbeat, SCAN_INTERVAL)

    # Initial heartbeat
    hass.async_create_task(_send_heartbeat())

    _LOGGER.info("Neo Cloud component initialized")
    return True
