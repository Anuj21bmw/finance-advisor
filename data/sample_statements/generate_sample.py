"""
Generate a realistic anonymized/fake Indian bank statement PDF for demo purposes.
Uses reportlab for PDF generation.

Run: python data/sample_statements/generate_sample.py
"""
import random
from datetime import datetime, timedelta
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus import HRFlowable


# ── Sample Data ───────────────────────────────────────────────────────────────

ACCOUNT_INFO = {
    "name": "Rahul Sharma",
    "account_no": "XXXX XXXX 4821",
    "ifsc": "SBIN0001234",
    "branch": "Mumbai Main Branch",
    "statement_period": "01 April 2024 to 30 September 2024",
    "opening_balance": 45230.50,
}

# Realistic Indian transaction categories
TRANSACTIONS = [
    # Format: (date_offset, description, debit, credit, category)
    (0,   "Opening Balance",                          0,       0,       "balance"),
    (1,   "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (2,   "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (3,   "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (4,   "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (5,   "SWIGGY - FOOD ORDER",                      450,     0,       "food"),
    (6,   "BIGBASKET - GROCERY",                      3200,    0,       "grocery"),
    (7,   "HDFC CREDIT CARD BILL PAYMENT",            15000,   0,       "credit_card"),
    (8,   "ELECTRICITY BILL - MSEDCL",                1800,    0,       "utility"),
    (9,   "OTT SUBSCRIPTION - NETFLIX",               649,     0,       "entertainment"),
    (10,  "ZOMATO FOOD",                              380,     0,       "food"),
    (11,  "PETROL PUMP - HP",                         2500,    0,       "transport"),
    (12,  "AMAZON PURCHASE",                          4299,    0,       "shopping"),
    (13,  "MUTUAL FUND REDEMPTION",                   0,       12000,   "investment_return"),
    (14,  "FREELANCE PAYMENT - CLIENT XYZ",           0,       25000,   "income"),
    (15,  "LIC PREMIUM - POLICY 123456",              8000,    0,       "insurance"),
    (16,  "IRCTC TICKET BOOKING",                     1850,    0,       "travel"),
    (17,  "MOBILE RECHARGE - AIRTEL",                 599,     0,       "utility"),
    (18,  "DOMINOS PIZZA",                            620,     0,       "food"),
    (19,  "GYM MEMBERSHIP",                           2000,    0,       "health"),
    (20,  "MEDICAL - APOLLO PHARMACY",                1200,    0,       "health"),
    (21,  "ATM WITHDRAWAL",                           5000,    0,       "cash"),
    (22,  "UPI - FRIEND RAMESH",                      2000,    0,       "transfer"),
    (25,  "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (26,  "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (27,  "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (28,  "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (30,  "ZOMATO - FOOD",                            520,     0,       "food"),
    (31,  "BIGBASKET GROCERY",                        2850,    0,       "grocery"),
    (32,  "AMAZON PRIME SUBSCRIPTION",                1499,    0,       "entertainment"),
    (33,  "UBER RIDE",                                340,     0,       "transport"),
    (34,  "FLIPKART PURCHASE",                        2999,    0,       "shopping"),
    (35,  "PPFAS FLEXI CAP FUND SIP",                 5000,    0,       "investment"),
    (36,  "MOBILE BILL - JIO",                        299,     0,       "utility"),
    (37,  "DENTIST CONSULTATION",                     800,     0,       "health"),
    (38,  "RESTAURANT - BARBEQUE NATION",             1800,    0,       "food"),
    (40,  "BOOK - AMAZON KINDLE",                     350,     0,       "entertainment"),
    (42,  "HOME LOAN EMI - HDFC BANK",                22000,   0,       "emi"),
    (45,  "CAR INSURANCE RENEWAL",                    9500,    0,       "insurance"),
    (46,  "DIVIDEND CREDIT - HDFC BANK",              0,       1200,    "investment_return"),
    (47,  "UPI - RAKHI GIFT TO SISTER",               3000,    0,       "transfer"),
    (50,  "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (51,  "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (52,  "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (53,  "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (54,  "PPFAS FLEXI CAP FUND SIP",                 5000,    0,       "investment"),
    (55,  "SWIGGY INSTAMART",                         1450,    0,       "grocery"),
    (56,  "PETROL - BHARAT PETROLEUM",                2200,    0,       "transport"),
    (57,  "CREDIT CARD PAYMENT",                      12000,   0,       "credit_card"),
    (58,  "OLA ELECTRIC - EMI",                       3500,    0,       "emi"),
    (60,  "BOOKING.COM - GOA TRIP",                   8500,    0,       "travel"),
    (65,  "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (66,  "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (67,  "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (68,  "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (69,  "PPFAS FLEXI CAP FUND SIP",                 5000,    0,       "investment"),
    (70,  "AMAZON PURCHASE - ELECTRONICS",            12500,   0,       "shopping"),
    (72,  "HEALTH INSURANCE PREMIUM",                 18000,   0,       "insurance"),
    (75,  "MUTUAL FUND SIP - NIFTY 50 INDEX",         3000,    0,       "investment"),
    (78,  "RESTAURANT BILL",                          2200,    0,       "food"),
    (80,  "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (81,  "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (82,  "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (83,  "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (84,  "PPFAS FLEXI CAP FUND SIP",                 5000,    0,       "investment"),
    (85,  "SWIGGY FOOD",                              890,     0,       "food"),
    (86,  "BIGBASKET",                                3100,    0,       "grocery"),
    (90,  "HOME LOAN EMI - HDFC BANK",                22000,   0,       "emi"),
    (95,  "ATM WITHDRAWAL",                           3000,    0,       "cash"),
    (98,  "FREELANCE INCOME - DESIGN PROJECT",        0,       35000,   "income"),
    (100, "AMAZON PURCHASE",                          5600,    0,       "shopping"),
    (102, "MEDICAL EXPENSES",                         2400,    0,       "health"),
    (105, "SALARY CREDIT - TECHCORP INDIA PVT LTD",  0,       85000,   "income"),
    (106, "NEFT - RENT - LANDLORD KRISHNA",           28000,   0,       "rent"),
    (107, "ACH - SIP MIRAE ASSET LARGE CAP",          5000,    0,       "investment"),
    (108, "ACH - SIP AXIS MIDCAP FUND",               3000,    0,       "investment"),
    (109, "PPFAS FLEXI CAP FUND SIP",                 5000,    0,       "investment"),
    (110, "RESTAURANT DINNER",                        1500,    0,       "food"),
    (115, "HOME LOAN EMI - HDFC BANK",                22000,   0,       "emi"),
    (120, "CLOSING PERIOD ENTRY",                     0,       0,       "balance"),
]


def generate_bank_statement(output_path: str = None) -> Path:
    """Generate a sample bank statement PDF."""
    if output_path is None:
        output_path = Path(__file__).parent / "sample_statement_rahul_sharma.pdf"
    else:
        output_path = Path(output_path)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Header ────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "BankTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a365d"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#4a5568"),
    )

    elements.append(Paragraph("STATE BANK OF INDIA", title_style))
    elements.append(Paragraph("Account Statement | Personal Banking", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a365d")))
    elements.append(Spacer(1, 0.3 * cm))

    # ── Account Details ───────────────────────────────────────────────────────
    account_data = [
        ["Account Holder", ACCOUNT_INFO["name"], "Account Number", ACCOUNT_INFO["account_no"]],
        ["IFSC Code", ACCOUNT_INFO["ifsc"], "Branch", ACCOUNT_INFO["branch"]],
        ["Statement Period", ACCOUNT_INFO["statement_period"], "Account Type", "Savings Account"],
        ["Opening Balance", f"₹{ACCOUNT_INFO['opening_balance']:,.2f}", "", ""],
    ]

    account_table = Table(account_data, colWidths=[4 * cm, 6 * cm, 4 * cm, 4 * cm])
    account_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7fafc")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#2d3748")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#2d3748")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(account_table)
    elements.append(Spacer(1, 0.5 * cm))

    # ── Transaction Table ─────────────────────────────────────────────────────
    elements.append(Paragraph("Transaction Details", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * cm))

    headers = ["Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)"]
    table_data = [headers]

    start_date = datetime(2024, 4, 1)
    balance = ACCOUNT_INFO["opening_balance"]

    for offset, desc, debit, credit, _ in TRANSACTIONS:
        txn_date = start_date + timedelta(days=offset)
        if txn_date > datetime(2024, 9, 30):
            break

        balance = balance - debit + credit

        if debit == 0 and credit == 0:
            continue  # Skip balance markers

        row = [
            txn_date.strftime("%d %b %Y"),
            desc[:45],  # Truncate long descriptions
            f"{debit:,.2f}" if debit > 0 else "-",
            f"{credit:,.2f}" if credit > 0 else "-",
            f"{balance:,.2f}",
        ]
        table_data.append(row)

    closing_balance = balance
    table_data.append([
        "30 Sep 2024", "CLOSING BALANCE", "", "", f"{closing_balance:,.2f}"
    ])

    col_widths = [2.5 * cm, 9 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm]
    txn_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    txn_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        # Data rows
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
        # Debit column in red
        ("TEXTCOLOR", (2, 1), (2, -1), colors.HexColor("#c53030")),
        # Credit column in green
        ("TEXTCOLOR", (3, 1), (3, -1), colors.HexColor("#276749")),
        # Closing balance row
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ebf8ff")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(txn_table)
    elements.append(Spacer(1, 0.5 * cm))

    # ── Summary ───────────────────────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e0")))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph("Account Summary (Apr–Sep 2024)", styles["Heading2"]))

    # Tuple layout: (date_offset, description, debit, credit, category)
    total_credits = sum(t[3] for t in TRANSACTIONS if t[3] > 0)
    total_debits = sum(t[2] for t in TRANSACTIONS if t[2] > 0)

    summary_data = [
        ["Total Credits", f"₹{total_credits:,.2f}", "Opening Balance", f"₹{ACCOUNT_INFO['opening_balance']:,.2f}"],
        ["Total Debits", f"₹{total_debits:,.2f}", "Closing Balance", f"₹{closing_balance:,.2f}"],
        ["Net Savings", f"₹{(total_credits - total_debits):,.2f}", "No. of Transactions", str(len(table_data) - 2)],
    ]

    summary_table = Table(summary_data, colWidths=[4 * cm, 5 * cm, 4 * cm, 5 * cm])
    summary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fff4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c6f6d5")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=7,
        textColor=colors.HexColor("#718096"),
    )
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    elements.append(Paragraph(
        "This is a computer-generated statement and does not require a signature. "
        "For any discrepancy, contact your branch within 30 days. "
        "Account information is SAMPLE/DEMO data for AI demonstration purposes only.",
        footer_style,
    ))

    doc.build(elements)
    print(f"Sample bank statement generated: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_bank_statement()
