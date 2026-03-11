import requests
from typing import List, Optional


class KlaviyoClient:
    BASE_URL = "https://a.klaviyo.com/api"
    API_REVISION = "2024-02-15"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Klaviyo-API-Key {api_key}",
            "accept": "application/json",
            "content-type": "application/json",
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
            "accept": "application/json",
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
        """Create a new email campaign."""
        url = f"{self.BASE_URL}/campaigns/"

        payload = {
            "data": {
                "type": "campaign",
                "attributes": {
                    "name": name,
                    "audiences": {
                        "included": [list_id]
                    },
                    "send_strategy": {
                        "method": "immediate" if not send_time else "static",
                        **({"options_static": {"datetime": send_time}} if send_time else {})
                    },
                    "campaign-messages": {
                        "data": [{
                            "type": "campaign-message",
                            "attributes": {
                                "channel": "email",
                                "label": "Email",
                                "content": {
                                    "subject": subject,
                                    "preview_text": preview_text
                                },
                                "template_id": template_id
                            }
                        }]
                    }
                }
            }
        }

        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

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
