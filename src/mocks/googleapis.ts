// Mock för Google API-biblioteken
export class OAuth2Client {
  constructor() {
    return {
      setCredentials: () => {},
      getAccessToken: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
      generateAuthUrl: () => '',
      getToken: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
    };
  }
}

export const google = {
  auth: {
    GoogleAuth: class {
      constructor() {
        return {
          getClient: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
          authorize: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
        };
      }
    },
    OAuth2Client
  },
  calendar: () => ({
    events: {
      list: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
      insert: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
      update: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
      delete: () => Promise.reject(new Error('Google Calendar-synkronisering är inte tillgänglig')),
    },
  }),
};

export default google; 