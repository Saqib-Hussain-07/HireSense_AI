jest.mock('../../src/models/User');

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { verifyAndUpsertClerkUser } = require('../../src/services/clerkAuth');

describe('clerkAuth Service (verifyAndUpsertClerkUser)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws error if token is missing or not a string', async () => {
    await expect(verifyAndUpsertClerkUser('')).rejects.toThrow('Token is required');
    await expect(verifyAndUpsertClerkUser(null)).rejects.toThrow('Token is required');
  });

  test('throws error if decoded token is missing kid header', async () => {
    const decodeSpy = jest.spyOn(jwt, 'decode').mockReturnValue({ header: {} });
    await expect(verifyAndUpsertClerkUser('dummy.token.no-kid')).rejects.toThrow(
      'Invalid token structure: missing key ID (kid)'
    );
    decodeSpy.mockRestore();
  });

  test('creates a new user when matching user is not found', async () => {
    const decodeSpy = jest.spyOn(jwt, 'decode').mockReturnValue({
      header: { kid: 'key-1' },
      payload: { sub: 'user_clerk_999', email: 'newbie@example.com', name: 'Newbie' },
    });

    const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation((token, getKey, opts, cb) => {
      cb(null, { sub: 'user_clerk_999', email: 'newbie@example.com', name: 'Newbie' });
    });

    User.findOne = jest.fn().mockResolvedValue(null);
    const mockCreatedUser = {
      _id: 'u999',
      clerkId: 'user_clerk_999',
      name: 'Newbie',
      email: 'newbie@example.com',
      toObject: () => ({ _id: 'u999', clerkId: 'user_clerk_999', name: 'Newbie', email: 'newbie@example.com' }),
    };
    User.create = jest.fn().mockResolvedValue(mockCreatedUser);

    const result = await verifyAndUpsertClerkUser('valid.jwt.token');

    expect(result).toBe(mockCreatedUser);
    expect(User.findOne).toHaveBeenCalledWith({
      $or: [
        { clerkId: 'user_clerk_999' },
        { email: 'user_clerk_999@clerk.local' },
        { email: 'newbie@example.com' },
      ],
    });
    expect(User.create).toHaveBeenCalledWith({
      clerkId: 'user_clerk_999',
      name: 'Newbie',
      email: 'newbie@example.com',
    });

    decodeSpy.mockRestore();
    verifySpy.mockRestore();
  });

  test('updates existing user attributes if changed', async () => {
    const decodeSpy = jest.spyOn(jwt, 'decode').mockReturnValue({
      header: { kid: 'key-1' },
      payload: { sub: 'user_clerk_222', email: 'upgraded@example.com', name: 'Real Name' },
    });

    const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation((token, getKey, opts, cb) => {
      cb(null, { sub: 'user_clerk_222', email: 'upgraded@example.com', name: 'Real Name' });
    });

    const mockExistingUser = {
      _id: 'u222',
      clerkId: 'old_clerk_id',
      email: 'old_clerk_id@clerk.local',
      name: 'User',
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne = jest.fn().mockResolvedValue(mockExistingUser);

    const result = await verifyAndUpsertClerkUser('valid.jwt.token');

    expect(result).toBe(mockExistingUser);
    expect(mockExistingUser.clerkId).toBe('user_clerk_222');
    expect(mockExistingUser.email).toBe('upgraded@example.com');
    expect(mockExistingUser.name).toBe('Real Name');
    expect(mockExistingUser.save).toHaveBeenCalled();

    decodeSpy.mockRestore();
    verifySpy.mockRestore();
  });
});
