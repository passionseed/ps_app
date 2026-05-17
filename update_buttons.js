const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components/Wrapped');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'WrappedButton.tsx' && f !== 'WrappedCTA.tsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let changed = false;

  // 1. Add import
  if (content.includes('ctaButton') || content.includes('doneButton')) {
    if (!content.includes('WrappedButton')) {
      content = content.replace(
        /import \{ AppText \} from "\.\.\/AppText";/,
        'import { AppText } from "../AppText";\nimport { WrappedButton } from "./WrappedButton";'
      );
      changed = true;
    }
  }

  // 2. Replace simple ctaButton Pressables
  const simplePressableRegex = /<Pressable\s+style=\{styles\.ctaButton\}\s+onPress=\{([^}]+)\}>\s*<AppText\s+variant="bold"\s+style=\{styles\.ctaText\}>\s*([^<]+)\s*<\/AppText>\s*<\/Pressable>/g;
  if (simplePressableRegex.test(content)) {
    content = content.replace(simplePressableRegex, '<WrappedButton onPress={$1}>\n            $2\n          </WrappedButton>');
    changed = true;
  }

  // 3. Replace disabled ctaButton in WrappedDragRankCard
  const disabledPressableRegex = /<Pressable\s*style=\{\[styles\.ctaButton,\s*!canContinue\s*&&\s*styles\.ctaButtonDisabled\]\}\s*onPress=\{([^}]+)\}\s*disabled=\{!canContinue\}\s*>\s*<AppText\s+variant="bold"\s+style=\{styles\.ctaText\}>\s*([^<]+)\s*<\/AppText>\s*<\/Pressable>/g;
  if (disabledPressableRegex.test(content)) {
    content = content.replace(disabledPressableRegex, '<WrappedButton onPress={$1} disabled={!canContinue}>\n            $2\n          </WrappedButton>');
    changed = true;
  }

  // 4. Replace doneButton in SummaryCard
  const donePressableRegex = /<Pressable\s+style=\{styles\.doneButton\}\s+onPress=\{([^}]+)\}>\s*<AppText\s+variant="bold"\s+style=\{styles\.doneText\}>\s*([^<]+)\s*<\/AppText>\s*<\/Pressable>/g;
  if (donePressableRegex.test(content)) {
    content = content.replace(donePressableRegex, '<WrappedButton onPress={$1} style={{ minWidth: 120 }}>\n            $2\n          </WrappedButton>');
    changed = true;
  }
  
  // 5. Replace secondary button in CalibrationCard (WrappedModal.tsx)
  const secondaryPressableRegex = /<Pressable\s*style=\{styles\.ctaButton\}\s*onPress=\{\(\)\s*=>\s*handleSecondarySelect\("not_me"\)\}\s*>\s*<AppText\s+variant="bold"\s+style=\{styles\.ctaText\}>\s*([^<]+)\s*<\/AppText>\s*<\/Pressable>/g;
  if (secondaryPressableRegex.test(content)) {
    content = content.replace(secondaryPressableRegex, '<WrappedButton onPress={() => handleSecondarySelect("not_me")}>\n            $1\n          </WrappedButton>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
