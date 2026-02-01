// screens/DonateScreen.tsx
import { useStripe, PaymentSheetError } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { View, Button, Text, TextInput } from 'react-native';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const tiers = [1, 3, 5];

export default function DonateScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [amount, setAmount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleDonate = async () => {
    if (!auth.currentUser) return alert('Please sign in');

    setLoading(true);
    try {
      // Call Firebase Cloud Function (or your Node backend)
      const response = await fetch('https://us-central1-your-project.cloudfunctions.net/createSubscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          email: auth.currentUser.email,
          amount: amount * 100, // cents
          currency: 'usd',
        }),
      });

      const { clientSecret, subscriptionId } = await response.json();

      // Init & present payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Volunteer DME Foundation',
        allowsDelayedPaymentMethods: true,
      });

      if (initError) throw initError;

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === PaymentSheetError.Canceled) {
          alert('Payment canceled');
        } else {
          alert(`Payment failed: ${error.message}`);
        }
      } else {
        // Success – save subscription to Firestore
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          subscriptionId,
          amount,
          status: 'active',
          updatedAt: new Date(),
        }, { merge: true });

        alert('Thank you! Your monthly donation is set up.');
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text>Choose monthly amount:</Text>
      {tiers.map(t => (
        <Button key={t} title={`$${t}/month`} onPress={() => setAmount(t)} />
      ))}
      <TextInput
        placeholder="Custom amount"
        keyboardType="numeric"
        onChangeText={txt => setAmount(Number(txt))}
      />
      <Button title={`Donate $${amount}/month`} onPress={handleDonate} disabled={loading} />
    </View>
  );
}
