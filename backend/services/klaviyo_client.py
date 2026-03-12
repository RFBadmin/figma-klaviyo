import requests
from typing import List, Optional


class KlaviyoClient:
    BASE_URL = "https://a.klaviyo.com/api"
    API_REVISION = "2026-01-15"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Klaviyo-API-Key {api_key}",
            "accept": "application/vnd.api+json",
            "content-type": "application/vnd.api+json",
            "revision": self.API_REVISION
        }

    # ─── Images ───────────────────────────────────────────────────────────────

    def upload_image(self, image_bytes: bytes, filename: str) -> str:
        """
        Upload image to Klaviyo CDN.
        Returns the hosted image URL.
        """
        url = f"{self.BASE_URL}/images/"

        upload_headers = {
            "Authorization": f"Klaviyo-API-Key {self.api_key}",
            "accept": "application/vnd.api+json",
            "revision": self.API_REVISION
        }

        files = {'file': (filename, image_bytes, 'image/jpeg')}
        response = requests.post(url, headers=upload_headers, files=files)
        response.raise_for_status()

        data = response.json()
        return data['data']['attributes']['image_url']

    # ─── Templates ────────────────────────────────────────────────────────────

    def create_template(self, name: str, html_content: str) -> dict:
        """Create a new email template in Klaviyo."""
        url = f"{self.BASE_URL}/templates/"

        payload = {
            "data": {
                "type": "template",
                "attributes": {
                    "name": name,
                    "html": html_content,
                    "editor_type": "CODE"
                }
            }
        }

        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

    # ─── Campaigns ────────────────────────────────────────────────────────────

    def create_campaign(
        self,
        name: str,
        subject: str,
        preview_text: str,
        list_id: str,
        template_id: str,
        send_time: Optional[str] = None
    ) -> dict:
        """
        Create a new email campaign and assign the template to it.
        Klaviyo requires two calls:
        1. POST /api/campaigns/        — creates campaign + auto-creates a message
        2. POST /api/campaign-message-assign-template/ — links template to the message
        """
        url = f"{self.BASE_URL}/campaigns/"

        payload = {
            "data": {
                "type": "campaign",
                "attributes": {
                    "name": name,
                    "audiences": {
                        "included": [list_id],
                        "excluded": []
                    },
                    **({"send_strategy": {
                        "method": "static",
                        "options_static": {"datetime": send_time}
                    }} if send_time else {}),
                    "campaign-messages": {
                        "data": [{
                            "type": "campaign-message",
                            "attributes": {
                                "channel": "email",
                                "label": name,
                                "content": {
                                    "subject": subject,
                                    "preview_text": preview_text
                                }
                            }
                        }]
                    }
                }
            }
        }

        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        campaign_data = response.json()

        # Get the auto-created message ID, then assign the template to it
        message_id = campaign_data['data']['relationships']['campaign-messages']['data'][0]['id']
        self._assign_template_to_message(message_id, template_id)

        return campaign_data

    def _assign_template_to_message(self, message_id: str, template_id: str) -> None:
        """Assign a template to a campaign message."""
        url = f"{self.BASE_URL}/campaign-message-assign-template/"

        payload = {
            "data": {
                "type": "campaign-message-assign-template",
                "relationships": {
                    "campaign-message": {
                        "data": {"type": "campaign-message", "id": message_id}
                    },
                    "template": {
                        "data": {"type": "template", "id": template_id}
                    }
                }
            }
        }

        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()

    # ─── Lists ────────────────────────────────────────────────────────────────

    def get_lists(self) -> List[dict]:
        """Fetch all available lists."""
        url = f"{self.BASE_URL}/lists/"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()

        data = response.json()
        return [
            {
                'id': item['id'],
                'name': item['attributes']['name'],
                'member_count': item['attributes'].get('profile_count', 0)
            }
            for item in data.get('data', [])
        ]
