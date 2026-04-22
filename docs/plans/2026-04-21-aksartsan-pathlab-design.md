# อักษรศาสตร์ PathLab Design

## Overview

A 5-day immersive PathLab that introduces high school students to what it means to study อักษรศาสตร์ (Arts/Humanities) through hands-on activities: text analysis, translation, and creative writing. Students explore the breadth of the field and evaluate their career fit through the ikigai framework.

## Target Audience

- **Level:** High school students exploring university majors
- **Goal:** Career fit decision + genuine taste of อักษรศาสตร์ work
- **Duration:** 5 days, ~30 min/day
- **Language:** Thai only

## Learning Objectives

By the end of this PathLab, students will:

1. **Experience** the core activities of อักษรศาสตร์: text analysis, translation, and creative writing
2. **Understand** what university อักษรศาสตร์ students actually do
3. **Explore** real career paths for อักษรศาสตร์ graduates
4. **Evaluate** their fit through ikigai self-reflection
5. **Decide** if อักษรศาสตร์ is a path worth pursuing

## Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| Learn by doing | Real activities, not just reading about the field |
| Breadth over depth | Sample multiple areas to find affinity |
| Real texts | Use actual poems, articles, songs that อักษรศาสตร์ students study |
| Self-reflection | Daily reflections + ikigai framework for career decision |

## 5-Day Structure

### Day 1: อักษรศาสตร์คืออะไร?

**Theme:** "วันนี้คุณจะได้ลองเป็นนักอักษรศาสตร์"

**Context Text:**
> ยินดีต้อนรับสู่การเดินทาง 5 วัน วันนี้คุณจะได้รู้ว่านักอักษรศาสตร์เขาทำอะไรกันแน่ ไม่ใช่แค่อ่านเกี่ยว แต่ได้ลงมือทำจริงๆ วันนี้เราจะเริ่มจากสิ่งที่นักอักษรศาสตร์ทำเป็นอันดับแรก: การอ่านและวิเคราะห์ตัวบท

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | ทำความรู้จักอักษรศาสตร์ | `text` | อธิบายว่าอักษรศาสตร์คืออะไร มีสาขาอะไรบ้าง |
| 2 | วิเคราะห์บทกวี | `text` + `daily_prompt` | อ่านบทกวีสั้น (เช่น กลอนของ สุนทรภู่ หรือเพลงลูกกรุง) แล้วตอบคำถาม: ความหมายคืออะไร? ใช้สัญลักษณ์อะไร? รู้สึกอย่างไรกับมัน? |
| 3 | บทกวีกับชีวิตจริง | `daily_prompt` | บทกวีที่อ่านสะท้อนอะไรเกี่ยวกับชีวิตคนไทยสมัยนั้น? ยังเกี่ยวข้องกับคนรุ่นใหม่ไหม? |
| 4 | Day 1 Reflection | `reflection_card` | วันนี้รู้สึกอย่างไร? ส่วนไหนสนุก? ส่วนไหนยาก? |

**ตัวอย่างบทกวี (บทกวีสุนทรภู่ - พระบาทสมเด็จพระพุทธเลิศหล้านภาลัย):**
```
น้ำน้อยใจกระเป๋าแตก
น้ำมากใจลอย
เมื่อน้ำน้อยกลัวตาย
เมื่อน้ำมากจึงเป็นสุข
```

**Reflection Prompts:**
- วันนี้ส่วนไหนที่คุณสนุกที่สุด?
- ส่วนไหนที่รู้สึกยากหรือไม่ถูกใจ?
- คุณอยากอ่านตัวบทแบบนี้อีกไหม?

---

### Day 2: ภาษาเป็นเครื่องมือ

**Theme:** "นักอักษรศาสตร์ใช้ภาษาเป็นอาวุธ"

**Context Text:**
> วันแรกคุณอ่านตัวบทไทย วันนี้เราจะมาลองใช้ภาษาเป็นเครื่องมือ — แปลข้อความระหว่างภาษาไทยกับภาษาต่างประเทศ ไม่ต้องเก่งมาก แค่อยากให้เห็นว่าการแปลคือศาสตร์แห่งภาษา

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | ภาษากับอักษรศาสตร์ | `text` | อธิบายว่าทำไมนักอักษรศาสตร์ต้องรู้ภาษาหลายภาษา |
| 2 | ลองแปลเล็กน้อย | `daily_prompt` | แปลประโยคสั้นๆ ไทย→อังกฤษ และ อังกฤษ→ไทย (มีคำแนะนำให้) |
| 3 | ถ้าแปลผิด? | `text` + `daily_prompt` | อ่านตัวอย่างการแปลที่ต่างกัน วิเคราะห์ว่าทำไมแปลไม่เหมือนกัน |
| 4 | ภาษากับวัฒนธรรม | `daily_prompt` | คำไทยคำไหนที่แปลเป็นอังกฤษไม่ได้ตรงๆ? ทำไม? |
| 5 | Day 2 Reflection | `reflection_card` | การแปลรู้สึกอย่างไร? ชอบไหมที่ต้องคิดเรื่องภาษา? |

**Reflection Prompts:**
- การแปลทำให้คุณมองภาษาไทยต่างขึ้นไหม?
- ส่วนไหนของวันนี้คุณชอบที่สุด?
- คุณรู้สึกว่าตัวเองเก่งภาษาต่างประเทศแค่ไหน?

---

### Day 3: สร้างงานสร้างสรรค์

**Theme:** "นักอักษรศาสตร์ไม่ได้แค่อ่าน — พวกเขายังสร้างสรรค์ด้วย"

**Context Text:**
> สองวันแรกคุณวิเคราะห์งานคนอื่น วันนี้คุณจะได้สร้างงานของตัวเอง ไม่ต้องเป็นกวี ไม่ต้องเก่งเขียน แค่อยากให้รู้ว่างานเขียนสร้างสรรค์เป็นส่วนสำคัญของอักษรศาสตร์

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | งานเขียนกับอักษรศาสตร์ | `text` | อธิบายว่าทำไมนักอักษรศาสตร์ต้องเขียนเยอะ |
| 2 | ลองเขียนงานสั้น | `daily_prompt` | เขียนเรื่องสั้น 200-300 คำ จากภาพหรือคำแรกของประโยคที่กำหนดให้ |
| 3 | ถ้าเป็นบทความ? | `daily_prompt` | ลองเขียนบทความสั้น 200 คำ เรื่องที่คุณสนใจ (เช่น รีวิวหนัง/เพลง/สิ่งที่ชอบ) |
| 4 | เขียนบทกวี | `daily_prompt` | ลองเขียนบทกวี 2 บรรทัด หรือ haiku 5-7-5 |
| 5 | Day 3 Reflection | `reflection_card` | การเขียนรู้สึกอย่างไร? ชอบเขียนไหม? |

**Reflection Prompts:**
- วันนี้คุณเขียนอะไร? รู้สึกอย่างไรกับสิ่งที่เขียน?
- ถ้าให้เลือกเขียนงานแบบไหน คุณจะเลือกแบบไหน (เรื่องสั้น / บทความ / บทกวี)?
- คุณรู้สึกว่าการเขียนเป็นสิ่งที่คุณอยากทำเยอะขึ้นไหม?

---

### Day 4: จริงๆ แล้วทำงานอะไร?

**Theme:** "อักษรศาสตร์จบไปทำงานอะไร?"

**Context Text:**
> สามวันแรกคุณได้ลองทำงานที่นักอักษรศาสตร์ทำ วันนี้เราจะมาดูจริงๆ ว่าคนจบอักษรศาสตร์ทำงานอะไรกัน มีอาชีพอะไรบ้าง และคุณสนใจอันไหน?

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | 5 อาชีพของคนจบอักษรศาสตร์ | `text` + `resource_link` | นักเขียน/บรรณาธิการ, นักแปล, ครู/อาจารย์, นักวิจัย, PR/Content Creator |
| 2 | สำรวจอาชีพที่สนใจ | `daily_prompt` | เลือกอาชีพ 1 อาชีพจาก 5 อัน แล้วหาข้อมูลเพิ่มเติม (ใช้ Google หรือข้อมูลที่ให้มา) |
| 3 | เปรียบเทียบกับสิ่งที่ทำ | `daily_prompt` | อาชีพที่สนใจ คล้ายกับกิจกรรมไหนใน 3 วันที่ผ่านมา? |
| 4 | Day 4 Reflection | `reflection_card` | อาชีพไหนที่สนใจ? ทำไม? |

**5 อาชีพที่คนจบอักษรศาสตร์ทำ:**
1. **นักเขียน/บรรณาธิการ** — เขียนหนังสือ บทความ นิตยสาร
2. **นักแปล** — แปลหนังสือ สารคดี งานเอกสาร
3. **ครู/อาจารย์** — สอนภาษา วรรณคดี สังคมศึกษา
4. **นักวิจัย** — วิจัยเรื่องภาษา วัฒนธรรม ประวัติศาสตร์
5. **PR/Content Creator** — เขียนคอนเทนต์ จัดการสื่อ

**Reflection Prompts:**
- อาชีพไหนที่สนใจที่สุด? ทำไม?
- อาชีพไหนที่คุณไม่สนใจ? ทำไม?
- อาชีพเหล่านี้ตรงกับสิ่งที่คุณชอบทำใน 3 วันที่ผ่านมาไหม?

---

### Day 5: ตัดสินใจ

**Theme:** "คุณรู้พอแล้ว — ถึงเวลาตัดสินใจ"

**Context Text:**
> ห้าวันผ่านไป คุณได้ลองวิเคราะห์ตัวบท แปลภาษา เขียนงานสร้างสรรค์ และสำรวจอาชีพ ตอนนี้คุณมีข้อมูลพอที่จะตัดสินใจได้แล้ว ว่าอักษรศาสตร์เหมาะกับคุณหรือเปล่า?

**Activities:**

| # | Title | Type | Description |
|---|-------|------|-------------|
| 1 | รีวิว 5 วัน | `text` | สรุปกิจกรรมที่ทำแต่ละวัน |
| 2 | Ikigai Mapping | `reflection_card` | ทำ ikigai ของตัวเอง: อะไรที่ชอบ? อะไรที่ทำได้ดี? อะไรที่โลกต้องการ? อะไรที่ได้รับค่าตอบแทน? |
| 3 | วิเคราะห์ตัวเอง | `daily_prompt` | ตอบคำถาม: วันไหนที่สนุกที่สุด? วันไหนที่ยากที่สุด? อะไรที่ทำให้ตัดสินใจได้? |
| 4 | คำตอบสุดท้าย | `daily_prompt` | ตัดสินใจ: อยากเดินต่อในเส้นทางอักษรศาสตร์ไหม? |
| 5 | ถ้าตัดสินใจแล้ว | `text` | แนะนำขั้นตอนถัดไป: จะเรียนอะไรเพิ่ม? จะหาข้อมูลอะไรอีก? |

**Ikigai Mapping Template:**
```
## Ikigai ของฉัน

**สิ่งที่ฉันรัก (Passion)**
- วันไหนใน 5 วันที่ฉันสนุกที่สุด?
- กิจกรรมอะไรที่ฉันอยากทำอีก?

**สิ่งที่ฉันทำได้ดี (Profession)**
- อะไรที่ฉันทำได้ดีใน 5 วันนี้?
- อะไรที่คนอื่นช่วยฉันได้?

**สิ่งที่โลกต้องการ (Mission)**
- ปัญหาอะไรที่งานอักษรศาสตร์แก้ได้?
- งานไหนที่สร้างคุณค่าให้สังคม?

**สิ่งที่ได้รับค่าตอบแทน (Vocation)**
- อาชีพไหนที่น่าสนใจและมีรายได้?
- ต้องเรียนอะไรเพิ่มเติม?
```

**Final Decision Template:**
```
## คำตอบสุดท้ายของฉัน

**หลังจาก 5 วันนี้ ฉันคิดว่า อักษรศาสตร์:**
[ ] ใช่! อยากเรียนต่อด้านนี้
[ ] อาจจะ... อยากลองเรียนอะไรที่กว้างกว่านี้ก่อน
[ ] ไม่แน่ใจ... อยากลอง PathLab อื่นดูก่อน
[ ] ไม่ใช่... ฉันสนใจด้านอื่นมากกว่า

**เหตุผล:**
[เขียน 2-3 ประโยค]

**สิ่งที่จะทำต่อไปใน 30 วัน:**
[เขียนแผน 1-2 ข้อ]
```

---

## Content Type Summary

| Content Type | Count | Purpose |
|--------------|-------|---------|
| `text` | 6 | อธิบายพื้นฐาน, แนะนำอาชีพ, สรุปวัน |
| `daily_prompt` | 10 | กิจกรรมหลัก (วิเคราะห์บทกวี, แปล, เขียนงาน, สำรวจอาชีพ) |
| `reflection_card` | 5 | Reflection ประจำวัน + ikigai + final decision |
| `resource_link` | 1 | แหล่งข้อมูลอาชีพ |

**Total Activities:** ~22 across 5 days (4-5 per day)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Completion rate | >70% complete all 5 days |
| Activity completion | >80% submit at least 3 daily prompts |
| Reflection quality | Average reflection >30 words |
| Career decision clarity | >90% make a clear decision on Day 5 |

---

## Technical Requirements

### Seed Creation
- `title`: "ทดลองอักษรศาสตร์: ค้นหาตัวเองว่าเหมาะกับมันไหม"
- `description`: "5 วันทดลองทำกิจกรรมของนักอักษรศาสตร์ — วิเคราะห์ตัวบท แปลภาษา เขียนงานสร้างสรรค์ — ก่อนตัดสินใจเลือกคณะ"
- `seed_type`: "pathlab"
- `visibility`: "visible"
- `category_id`: Link to "Career Exploration" category

### Path Structure
- `total_days`: 5
- Each day has 4-5 activities
- Mix of content types as specified above

---

## Next Steps

1. Create seed record in database
2. Generate path_days, path_activities, and path_content
3. Test the full PathLab flow
