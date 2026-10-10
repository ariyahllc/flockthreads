from print_art import masculine, feminine, youth, CREAM, ESPRESSO

MASC = [
    ("iiw-mens", ["IT IS WELL"], "WITH MY SOUL"),
    ("beloveds-m", ["I AM", "MY BELOVED'S"], "SONG OF SONGS 6:3"),
    ("goodthing-m", ["HE WHO FINDS A WIFE", "FINDS A GOOD THING"], "PROV. 18:22"),
    ("twoarebetter-m", ["TWO ARE", "BETTER"], "ECCL. 4:9"),
    ("loveis-m", ["LOVE IS", "PATIENT"], "1 COR. 13:4"),
    ("myhouse-m", ["AS FOR ME", "& MY HOUSE"], "JOSHUA 24:15"),
    ("yoked-m", ["EQUALLY", "YOKED"], "2 COR. 6:14"),
    ("lovewife-m", ["LOVE YOUR WIFE"], "EPH. 5:25"),
    ("givethanks-m", ["GIVE", "THANKS"], "PSALM 107:1"),
    ("blessed-m", ["BLESSED"], None),
    ("jesusreason-m", ["JESUS IS", "THE REASON"], "LUKE 2:11"),
    ("newmercies-m", ["NEW", "MERCIES"], "LAM. 3:23"),
]
FEM = [
    ("iiw-w", "It is", ["WELL"], "WITH MY SOUL"),
    ("beloveds-w", "And my", ["BELOVED IS MINE"], "SONG OF SONGS 6:3"),
    ("goodthing-w", "His", ["GOOD THING"], "PROV. 18:22"),
    ("twoarebetter-w", "Than", ["ONE"], "ECCL. 4:9"),
    ("loveis-w", "Love is", ["KIND"], "1 COR. 13:4"),
    ("myhouse-w", "We will", ["SERVE THE LORD"], "JOSHUA 24:15"),
    ("yoked-w", "Equally", ["YOKED"], "2 COR. 6:14"),
    ("respecthusband-w", "Respect", ["YOUR HUSBAND"], "EPH. 5:33"),
    ("givethanks-w", "Give thanks", ["WITH A GRATEFUL", "HEART"], "1 THESS. 5:18"),
    ("grateful-w", "Grateful", ["BEYOND MEASURE"], None),
    ("jesusreason-w", "Jesus is the reason", ["FOR THE SEASON"], "LUKE 2:11"),
    ("newmercies-w", "New mercies", ["EVERY MORNING"], "LAM. 3:23"),
]
YTH = [
    ("thankful-y", ["THANKFUL"], "pumpkin"),
    ("merrybright-y", ["MERRY &", "BRIGHT"], "star"),
]

n = 0
for name, lines, ref in MASC:
    masculine(f"{name}-cream.png", lines, verse_ref=ref, ink=CREAM); n += 1
    masculine(f"{name}-espresso.png", lines, verse_ref=ref, ink=ESPRESSO); n += 1
for name, script, serif_lines, ref in FEM:
    feminine(f"{name}-cream.png", script, serif_lines, verse_ref=ref, ink=CREAM); n += 1
    feminine(f"{name}-espresso.png", script, serif_lines, verse_ref=ref, ink=ESPRESSO); n += 1
for name, lines, doodle in YTH:
    youth(f"{name}-espresso.png", lines, doodle=doodle, ink=ESPRESSO); n += 1
    youth(f"{name}-cream.png", lines, doodle=doodle, ink=CREAM); n += 1
print("rendered", n, "files")
