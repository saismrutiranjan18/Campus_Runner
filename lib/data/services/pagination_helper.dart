import 'package:cloud_firestore/cloud_firestore.dart';

class PaginationHelper<T> {
  final int pageSize;
  final Query Function() queryBuilder;
  final T Function(DocumentSnapshot doc) itemBuilder;

  DocumentSnapshot? _lastDocument;
  bool _hasMore = true;
  final List<T> _allItems = [];

  PaginationHelper({
    required this.queryBuilder,
    required this.itemBuilder,
    this.pageSize = 20,
  });

  Future<List<T>> loadNextPage() async {
    if (!_hasMore) return [];

    Query query = queryBuilder().limit(pageSize);

    if (_lastDocument != null) {
      query = query.startAfterDocument(_lastDocument!);
    }

    final snapshot = await query.get();

    if (snapshot.docs.isEmpty) {
      _hasMore = false;
      return [];
    }

    if (snapshot.docs.length < pageSize) {
      _hasMore = false;
    }

    _lastDocument = snapshot.docs.last;

    final newItems = snapshot.docs.map((doc) => itemBuilder(doc)).toList();
    _allItems.addAll(newItems);

    return newItems;
  }

  List<T> get allItems => List.unmodifiable(_allItems);
  bool get hasMore => _hasMore;
  int get currentCount => _allItems.length;

  void reset() {
    _lastDocument = null;
    _hasMore = true;
    _allItems.clear();
  }
}
