import { View } from 'react-native';
import ConversationList from './ConversationList';

export default function ConversationListScreen({ navigation, route }) {
  const { currentUserId, currentUser } = route.params || {};

  return (
    <View style={{ flex: 1 }}>
      <ConversationList
        currentUser={currentUser}
        onSelect={(conversation) => {
          if (!conversation || !conversation.user_id) return;
          navigation.navigate("PrivateChat", {
            currentUserId,
            otherUser: {
              id: conversation.user_id,
              name: conversation.user_name,
            },
          });
        }}
      />
    </View>
  );
}