import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import {
  PageBg,
  Text as ThemeText,
  Space,
  Accent,
} from "../../lib/theme";
import type { PathContent } from "../../types/pathlab-content";

interface Props {
  content: PathContent;
  onComplete: () => void;
}

const markdownStyles = {
  body: {
    fontFamily: "BaiJamjuree_400Regular",
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  heading1: {
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 20,
    color: ThemeText.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  heading2: {
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 17,
    color: ThemeText.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  heading3: {
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 15,
    color: ThemeText.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  strong: { fontFamily: "BaiJamjuree_700Bold", color: ThemeText.primary },
  em: {
    fontFamily: "BaiJamjuree_400Regular",
    fontStyle: "italic" as const,
  },
  code_inline: {
    fontFamily: "BaiJamjuree_400Regular",
    backgroundColor: PageBg.offWhite,
    color: ThemeText.primary,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    fontFamily: "BaiJamjuree_400Regular",
    backgroundColor: PageBg.offWhite,
    color: ThemeText.primary,
    padding: 12,
    borderRadius: 8,
  },
  fence: {
    fontFamily: "BaiJamjuree_400Regular",
    backgroundColor: PageBg.offWhite,
    color: ThemeText.primary,
    padding: 12,
    borderRadius: 8,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Accent.yellow,
    paddingLeft: 12,
    marginVertical: 8,
  },
  link: { color: Accent.yellowDark },
  hr: {
    backgroundColor: "rgba(0,0,0,0.08)",
    height: 1,
    marginVertical: 12,
  },
};

export default function TextActivity({ content, onComplete: _onComplete }: Props) {
  return (
    <GlassCard style={styles.contentCard}>
      {content.content_title && (
        <AppText variant="bold" style={styles.contentTitle}>
          {content.content_title}
        </AppText>
      )}
      {content.content_body && (
        <Markdown style={markdownStyles}>{content.content_body}</Markdown>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  contentCard: {
    marginBottom: Space.lg,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
});
