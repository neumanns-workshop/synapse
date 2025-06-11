import React, { useEffect } from "react";
import { ScrollView, View, Platform } from "react-native";

import { Text, Card, IconButton } from "react-native-paper";

import { useTheme } from "../context/ThemeContext";

interface LegalPageProps {
  type: "terms" | "privacy" | "dmca" | "about" | "contact";
  onBack?: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const { theme } = useTheme();

  // Set page title for web
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const titles = {
        terms: "Terms of Service - Synapse",
        privacy: "Privacy Policy - Synapse",
        dmca: "DMCA Policy - Synapse",
        about: "About - Synapse",
        contact: "Contact - Synapse",
      };
      document.title = titles[type];
    }
  }, [type]);

  const renderBackButton = () =>
    Platform.OS !== "web" &&
    onBack && (
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
      >
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={onBack}
          iconColor={theme.colors.primary}
        />
        <Text style={{ color: theme.colors.primary, fontSize: 16 }}>
          Back to Game
        </Text>
      </View>
    );

  const renderTermsOfService = () => (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, maxWidth: 800, alignSelf: "center" }}>
        {renderBackButton()}
        <Text
          variant="headlineLarge"
          style={{ color: theme.colors.onBackground, marginBottom: 20 }}
        >
          Terms of Service
        </Text>

        <Text
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}
        >
          Effective Date: January 10, 2025
        </Text>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              1. Acceptance of Terms
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              By accessing or using Synapse (&quot;the Service&quot;), a word
              navigation puzzle game operated by Neumann&apos;s Workshop, LLC,
              doing business as Galaxy Brain Entertainment (&quot;Company&quot;,
              &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to
              be bound by these Terms of Service (&quot;Terms&quot;). If you do
              not agree to these Terms, do not use the Service.
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              2. Description of Service
            </Text>
            <Text
              style={{
                color: theme.colors.onSurface,
                lineHeight: 24,
                marginBottom: 10,
              }}
            >
              Synapse is an interactive word navigation puzzle game that
              challenges players to find paths between words using semantic
              relationships. The Service includes:
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              • Daily word navigation challenges{"\n"}• Progress tracking and
              statistics{"\n"}• User accounts and cloud data synchronization
              {"\n"}• Premium account features (one-time purchase){"\n"}•
              Community features and leaderboards
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              3. Premium Purchase
            </Text>
            <Text
              style={{
                color: theme.colors.onSurface,
                lineHeight: 24,
                marginBottom: 10,
              }}
            >
              • Premium accounts are available for a one-time payment of $5.00
              USD{"\n"}• Premium purchase provides permanent access to enhanced
              features{"\n"}• All payments are processed securely through Stripe
              {"\n"}• 7-day satisfaction guarantee for refunds
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              4. Your Account &amp; Privacy Controls
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              <Text style={{ fontWeight: "bold" }}>Account Management:</Text>
              {"\n"}• Access account settings through the app&apos;s Account
              menu
              {"\n"}• Manage privacy preferences including analytics and
              leaderboards{"\n"}• Update email communication preferences{"\n"}•
              Delete your account permanently at any time{"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Data Control:</Text>
              {"\n"}• All account deletion is immediate and permanent{"\n"}•
              Premium purchases cannot be recovered after account deletion{"\n"}
              • You may request data export before deletion{"\n"}• Contact
              support for assistance with account management
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              5. Contact Information
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              For questions about these Terms or the Service:{"\n"}
              Support: synapse@neumannsworkshop.com{"\n"}
              Website: synapsegame.ai
            </Text>
          </Card.Content>
        </Card>

        <Text
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          These Terms of Service are designed to protect both users and the
          service while maintaining a fair and enjoyable gaming experience.
        </Text>
      </View>
    </ScrollView>
  );

  const renderPrivacyPolicy = () => (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, maxWidth: 800, alignSelf: "center" }}>
        {renderBackButton()}
        <Text
          variant="headlineLarge"
          style={{ color: theme.colors.onBackground, marginBottom: 20 }}
        >
          Privacy Policy
        </Text>

        <Text
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}
        >
          Last updated: January 10, 2025
        </Text>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              Introduction
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              Synapse (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
              respects your privacy and is committed to protecting your personal
              information. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our word
              navigation puzzle game.
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              Information We Collect
            </Text>
            <Text
              style={{
                color: theme.colors.onSurface,
                lineHeight: 24,
                marginBottom: 10,
              }}
            >
              We collect information you provide directly, such as when you
              create an account, purchase a premium subscription, or contact us.
              This may include:
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              • Account Information: Email address, password (encrypted), and
              account preferences{"\n"}• Game Progress: Game statistics,
              achievements, challenge completions{"\n"}• Payment Information:
              Processed securely through Stripe; we do not store credit card
              details{"\n"}• Usage Data: Game sessions, feature usage, and
              performance metrics (if opted in)
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              How We Use Your Information
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              We use your information to provide and maintain the game service,
              sync your progress across devices, process payments for premium
              features, and improve game performance and features.
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              Your Rights &amp; Controls
            </Text>
            <Text
              style={{
                color: theme.colors.onSurface,
                lineHeight: 24,
                marginBottom: 12,
              }}
            >
              You have full control over your data and privacy settings:
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              <Text style={{ fontWeight: "bold" }}>Privacy Settings:</Text>
              {"\n"}• Manage analytics and data collection preferences{"\n"}•
              Control leaderboard participation{"\n"}• Adjust email
              communication preferences{"\n"}• Access via Account Settings in
              the app{"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Data Rights:</Text>
              {"\n"}• Access your personal information{"\n"}• Correct inaccurate
              information{"\n"}• Request data portability{"\n"}• Contact us at
              synapse@neumannsworkshop.com{"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Account Deletion:</Text>
              {"\n"}• Delete your account permanently through Account Settings
              {"\n"}• All personal data and game progress will be removed{"\n"}•
              Premium purchases cannot be recovered after account deletion{"\n"}
              • Deletion is immediate and cannot be undone
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  const renderDMCAPolicy = () => (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, maxWidth: 800, alignSelf: "center" }}>
        {renderBackButton()}
        <Text
          variant="headlineLarge"
          style={{ color: theme.colors.onBackground, marginBottom: 20 }}
        >
          DMCA Policy
        </Text>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              DMCA Compliance
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              Galaxy Brain Entertainment (operating under Neumann&apos;s
              Workshop, LLC) respects the intellectual property rights of others
              and expects users to do the same. In accordance with the Digital
              Millennium Copyright Act of 1998 (DMCA), we will respond promptly
              to valid notices of alleged copyright infringement.
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              Filing a DMCA Notice
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              If you believe that your copyrighted work has been used in a way
              that constitutes copyright infringement in the Synapse game or
              website, please provide our designated Copyright Agent with the
              required information including identification of the copyrighted
              work, your contact information, and a statement of good faith
              belief.
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, marginBottom: 10 }}
            >
              DMCA Contact Information
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              Copyright Agent: Galaxy Brain Entertainment{"\n"}
              DMCA Compliance{"\n"}
              Email: synapse@neumannsworkshop.com{"\n"}
              Subject Line: &quot;DMCA Takedown Notice&quot;
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  const renderAboutPage = () => (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, maxWidth: 800, alignSelf: "center" }}>
        {renderBackButton()}
        <Text
          variant="headlineLarge"
          style={{ color: theme.colors.onBackground, marginBottom: 20 }}
        >
          About Synapse
        </Text>
        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              Synapse is a word navigation puzzle game born from a passion for
              language, data, and elegant challenges. It&apos;s designed for
              those who love to explore the hidden connections between words and
              test their semantic intuition.
            </Text>
          </Card.Content>
        </Card>

        <Text
          variant="headlineSmall"
          style={{
            color: theme.colors.onBackground,
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Our Philosophy
        </Text>
        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              We believe in creating games that are not just fun, but also
              enriching. Synapse is built on a few core principles:{"\n"}
              <Text style={{ fontWeight: "bold" }}>Intellectual:</Text> We
              challenge you to think critically about language.{"\n"}
              <Text style={{ fontWeight: "bold" }}>Minimalist:</Text> A clean,
              distraction-free interface keeps you focused on the puzzle.{"\n"}
              <Text style={{ fontWeight: "bold" }}>Fair:</Text> A single,
              one-time purchase unlocks all premium features, forever. No ads,
              no subscriptions, no nonsense.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  const renderContactPage = () => (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20, maxWidth: 800, alignSelf: "center" }}>
        {renderBackButton()}
        <Text
          variant="headlineLarge"
          style={{ color: theme.colors.onBackground, marginBottom: 20 }}
        >
          Contact Us
        </Text>
        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text
              style={{
                color: theme.colors.onSurface,
                lineHeight: 24,
                marginBottom: 10,
              }}
            >
              We&apos;d love to hear from you! Whether you have a question, a
              suggestion, or just want to say hello, here&apos;s how to reach
              us.
            </Text>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              <Text style={{ fontWeight: "bold" }}>General Inquiries:</Text>
              {"\n"}
              synapse@neumannsworkshop.com{"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Support:</Text>
              {"\n"}
              support@neumannsworkshop.com{"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Press:</Text>
              {"\n"}
              press@neumannsworkshop.com
            </Text>
          </Card.Content>
        </Card>

        <Text
          variant="headlineSmall"
          style={{
            color: theme.colors.onBackground,
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Follow Us
        </Text>
        <Card
          style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}
        >
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
              Stay up-to-date with the latest news, updates, and community
              events.{"\n"}
              <Text style={{ fontWeight: "bold" }}>Twitter:</Text> @SynapseGame
              {"\n"}
              <Text style={{ fontWeight: "bold" }}>Discord:</Text>{" "}
              discord.gg/SynapseGame
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  switch (type) {
    case "terms":
      return renderTermsOfService();
    case "privacy":
      return renderPrivacyPolicy();
    case "dmca":
      return renderDMCAPolicy();
    case "about":
      return renderAboutPage();
    case "contact":
      return renderContactPage();
    default:
      return null;
  }
};
