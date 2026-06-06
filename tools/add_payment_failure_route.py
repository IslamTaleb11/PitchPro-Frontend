from pathlib import Path

path = Path(r'c:\Users\MSI\Desktop\PitchPro\pitchpro-frontend\src\router\index.js')
text = path.read_text(encoding='utf-8')
old = "  {\n    path: '/payment-success',\n    name: 'PaymentSuccess',\n    component: PaymentSuccess,\n    alias: '/dashboard/payment-success'\n  }\n]"
new = "  {\n    path: '/payment-success',\n    name: 'PaymentSuccess',\n    component: PaymentSuccess,\n    alias: '/dashboard/payment-success'\n  },\n  {\n    path: '/payment-failure',\n    name: 'PaymentFailure',\n    component: PaymentFailure\n  }\n]"
if old not in text:
    raise SystemExit('Old block not found')
path.write_text(text.replace(old, new), encoding='utf-8')
print('updated')
