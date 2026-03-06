// Migration Script: Populate User Earnings
// Run this ONCE after deploying the performance optimizations
// 
// Usage:
// 1. Ensure Firebase is initialized in your app
// 2. Call this function from a temporary screen or main.dart
// 3. Remove after migration is complete

// ignore_for_file: avoid_print

import 'package:cloud_firestore/cloud_firestore.dart';

Future<void> migrateUserEarnings() async {
  final firestore = FirebaseFirestore.instance;
  
  print('🚀 Starting user earnings migration...');
  
  try {
    // Get all users
    final usersSnapshot = await firestore.collection('users').get();
    final totalUsers = usersSnapshot.docs.length;
    
    print('📊 Found $totalUsers users to migrate');
    
    int successCount = 0;
    int errorCount = 0;
    
    for (var i = 0; i < usersSnapshot.docs.length; i++) {
      final userDoc = usersSnapshot.docs[i];
      final userId = userDoc.id;
      final userData = userDoc.data();
      
      try {
        // Skip if already migrated
        if (userData.containsKey('totalEarnings')) {
          print('⏭️  User $userId already migrated, skipping...');
          successCount++;
          continue;
        }
        
        // Get all completed transactions for this runner
        final transactionsSnapshot = await firestore
            .collection('transactions')
            .where('runnerId', isEqualTo: userId)
            .where('status', isEqualTo: 'COMPLETED')
            .get();
        
        double totalEarnings = 0.0;
        int completedTasks = transactionsSnapshot.docs.length;
        
        // Calculate total earnings
        for (var txnDoc in transactionsSnapshot.docs) {
          final txnData = txnDoc.data();
          final amount = double.tryParse(txnData['amount']?.toString() ?? '0') ?? 0.0;
          totalEarnings += amount;
        }
        
        // Update user document
        await userDoc.reference.update({
          'totalEarnings': totalEarnings,
          'completedTasks': completedTasks,
        });
        
        successCount++;
        print('✅ [$successCount/$totalUsers] User $userId: ₹${totalEarnings.toStringAsFixed(2)} ($completedTasks tasks)');
        
      } catch (e) {
        errorCount++;
        print('❌ Error migrating user $userId: $e');
      }
    }
    
    print('\n🎉 Migration complete!');
    print('✅ Success: $successCount users');
    if (errorCount > 0) {
      print('❌ Errors: $errorCount users');
    }
    print('💰 Total users migrated: $successCount/$totalUsers');
    
  } catch (e) {
    print('❌ Migration failed: $e');
    rethrow;
  }
}

// Optional: Verify migration
Future<void> verifyMigration() async {
  final firestore = FirebaseFirestore.instance;
  
  print('\n🔍 Verifying migration...');
  
  final usersSnapshot = await firestore.collection('users').get();
  int migratedCount = 0;
  int notMigratedCount = 0;
  
  for (var userDoc in usersSnapshot.docs) {
    final userData = userDoc.data();
    if (userData.containsKey('totalEarnings')) {
      migratedCount++;
    } else {
      notMigratedCount++;
      print('⚠️  User ${userDoc.id} not migrated');
    }
  }
  
  print('✅ Migrated: $migratedCount users');
  print('⚠️  Not migrated: $notMigratedCount users');
  
  if (notMigratedCount == 0) {
    print('🎉 All users successfully migrated!');
  }
}

// Run both migration and verification
Future<void> runMigration() async {
  await migrateUserEarnings();
  await verifyMigration();
}
