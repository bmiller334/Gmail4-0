import yaml
import sys
import codecs

with codecs.open('trigger.yaml', 'r', 'utf-16le') as f:
    try:
        data = yaml.safe_load(f)
    except Exception as e:
        # try utf-8
        pass

with open('trigger.yaml', 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

# The exported trigger has a 'build' section. We replace it with 'filename'
if 'build' in data:
    del data['build']

data['filename'] = 'cloudbuild.yaml'

with open('trigger-updated.yaml', 'w', encoding='utf-8') as f:
    yaml.dump(data, f, default_flow_style=False)
