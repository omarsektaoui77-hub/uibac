BRANCH_DATA = {
    "common": [
        {"id": "islamic_studies", "name": "Islamic Studies", "icon": "🕌"},
        {"id": "french", "name": "French", "icon": "🇫🇷"},
        {"id": "arabic", "name": "Arabic", "icon": "📖"},
        {"id": "philosophy", "name": "Philosophy", "icon": "🧠"},
        {"id": "history_geo", "name": "History / Geography", "icon": "🌍"}
    ],
    "SM": {
        "label": "Mathematical Sciences",
        "subjects": [
            {"id": "advanced_math", "name": "Advanced Mathematics", "icon": "➗"},
            {"id": "physics_chemistry", "name": "Physics & Chemistry", "icon": "⚛️"},
            {"id": "engineering_sciences_smb", "name": "Engineering Sciences (SM-B)", "icon": "⚙️"}
        ]
    }
}

# Helper to get all valid subject IDs for AI validation
VALID_SUBJECT_IDS = [s["id"] for s in BRANCH_DATA["common"]] + \
                    [s["id"] for s in BRANCH_DATA["SM"]["subjects"]]
