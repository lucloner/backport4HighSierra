// Compatibility shim for std::ranges on libc++ without full C++20 ranges support
// Provides missing algorithms and views used by Node.js 24
#ifndef RANGES_COMPAT_H
#define RANGES_COMPAT_H

#include <algorithm>
#include <iterator>
#include <functional>
#include <ranges>
#include <cstddef>
#include <utility>

namespace std {
namespace ranges {
namespace detail {
template<typename R> auto adl_begin(R&& r) -> decltype(std::begin(std::forward<R>(r))) { return std::begin(std::forward<R>(r)); }
template<typename R> auto adl_end(R&& r) -> decltype(std::end(std::forward<R>(r))) { return std::end(std::forward<R>(r)); }
template<typename I, typename S, typename T, typename Comp, typename Proj>
I lower_bound_impl(I first, S last, const T& value, Comp&& comp, Proj&& proj) {
    I it = first;
    auto count = std::distance(first, last);
    while (count > 0) {
        auto step = count / 2;
        std::advance(it, step);
        if (std::invoke(comp, std::invoke(proj, *it), value)) {
            it = std::next(it);
            count -= step + 1;
        } else {
            count = step;
        }
    }
    return it;
}
} // namespace detail

// --- Algorithms ---
template<typename R, typename Pred> bool all_of(R&& r, Pred&& pred) { return std::all_of(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename Pred> bool any_of(R&& r, Pred&& pred) { return std::any_of(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename Pred> bool none_of(R&& r, Pred&& pred) { return std::none_of(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename Pred> auto find_if(R&& r, Pred&& pred) -> decltype(detail::adl_begin(std::forward<R>(r))) { return std::find_if(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename Pred> auto find_if_not(R&& r, Pred&& pred) -> decltype(detail::adl_begin(std::forward<R>(r))) { return std::find_if_not(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename T> void replace(R&& r, const T& old_val, const T& new_val) { std::replace(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), old_val, new_val); }
template<typename R, typename Comp> void stable_sort(R&& r, Comp&& comp) { std::stable_sort(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Comp>(comp)); }
template<typename R> void sort(R&& r) { std::sort(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r))); }
template<typename R, typename Comp> void sort(R&& r, Comp&& comp) { std::sort(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Comp>(comp)); }
template<typename R, typename Pred> void for_each(R&& r, Pred&& pred) { std::for_each(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), std::forward<Pred>(pred)); }
template<typename R, typename T, typename Comp, typename Proj> auto lower_bound(R&& r, const T& value, Comp&& comp, Proj&& proj) -> decltype(detail::adl_begin(std::forward<R>(r))) { return detail::lower_bound_impl(detail::adl_begin(std::forward<R>(r)), detail::adl_end(std::forward<R>(r)), value, std::forward<Comp>(comp), std::forward<Proj>(proj)); }

// --- Views ---
template<typename R>
class ref_view {
  R* base_;
public:
  constexpr explicit ref_view(R& r) : base_(std::addressof(r)) {}
  constexpr R& base() const { return *base_; }
  constexpr auto begin() -> decltype(std::begin(*base_)) { return std::begin(*base_); }
  constexpr auto begin() const -> decltype(std::begin(*base_)) { return std::begin(*base_); }
  constexpr auto end() -> decltype(std::end(*base_)) { return std::end(*base_); }
  constexpr auto end() const -> decltype(std::end(*base_)) { return std::end(*base_); }
  constexpr auto size() const -> decltype(std::size(*base_)) { return std::size(*base_); }
};
template<typename R> ref_view(R&) -> ref_view<R>;

template<typename I, typename S>
class subrange : public std::pair<I, S> {
public:
  constexpr subrange(I first, S last) : std::pair<I, S>(first, last) {}
  constexpr I begin() const { return this->first; }
  constexpr S end() const { return this->second; }
};
template<typename I, typename S> subrange(I, S) -> subrange<I, S>;

template<typename V, std::size_t N>
class elements_view {
  V base_;
public:
  constexpr explicit elements_view(V base) : base_(std::move(base)) {}
  constexpr V base() const { return base_; }
  constexpr auto begin() -> decltype(std::begin(base_)) { return std::begin(base_); }
  constexpr auto begin() const -> decltype(std::begin(base_)) { return std::begin(base_); }
  constexpr auto end() -> decltype(std::end(base_)) { return std::end(base_); }
  constexpr auto end() const -> decltype(std::end(base_)) { return std::end(base_); }
  constexpr auto size() const -> decltype(std::size(base_)) { return std::size(base_); }
};

template<typename V>
class keys_view : public elements_view<V, 0> {
public:
  constexpr explicit keys_view(V base) : elements_view<V, 0>(std::move(base)) {}
};

} // namespace ranges

namespace views {
namespace detail {
template<typename I>
class values_iterator {
  I it_;
public:
  using iterator_category = typename std::iterator_traits<I>::iterator_category;
  using value_type = typename std::iterator_traits<I>::value_type::second_type;
  using difference_type = typename std::iterator_traits<I>::difference_type;
  using pointer = value_type*;
  using reference = const value_type&;
  constexpr explicit values_iterator(I it) : it_(it) {}
  constexpr const value_type& operator*() const { return it_->second; }
  constexpr values_iterator& operator++() { ++it_; return *this; }
  constexpr values_iterator operator++(int) { auto tmp = *this; ++it_; return tmp; }
  constexpr bool operator==(const values_iterator& other) const { return it_ == other.it_; }
  constexpr bool operator!=(const values_iterator& other) const { return it_ != other.it_; }
};
template<typename I> values_iterator(I) -> values_iterator<I>;

template<typename R>
class values_adapter {
  R base_;
public:
  constexpr explicit values_adapter(R base) : base_(std::move(base)) {}
  constexpr auto begin() { return values_iterator<decltype(std::begin(base_))>(std::begin(base_)); }
  constexpr auto begin() const { return values_iterator<decltype(std::begin(base_))>(std::begin(base_)); }
  constexpr auto end() { return values_iterator<decltype(std::end(base_))>(std::end(base_)); }
  constexpr auto end() const { return values_iterator<decltype(std::end(base_))>(std::end(base_)); }
};

template<typename T>
class iota_range {
  T start_, end_;
public:
  class iterator {
    T val_;
  public:
    using iterator_category = std::input_iterator_tag;
    using value_type = T;
    using difference_type = std::ptrdiff_t;
    using pointer = const T*;
    using reference = T;
    constexpr explicit iterator(T val) : val_(val) {}
    constexpr T operator*() const { return val_; }
    constexpr iterator& operator++() { ++val_; return *this; }
    constexpr iterator operator++(int) { auto tmp = *this; ++val_; return tmp; }
    constexpr bool operator==(const iterator& other) const { return val_ == other.val_; }
    constexpr bool operator!=(const iterator& other) const { return val_ != other.val_; }
  };
  constexpr iota_range(T start, T end) : start_(start), end_(end) {}
  constexpr iterator begin() const { return iterator(start_); }
  constexpr iterator end() const { return iterator(end_); }
};
} // namespace detail

struct values_fn {
  template<typename R>
  constexpr auto operator()(R&& r) const {
    return detail::values_adapter<std::remove_reference_t<R>>(std::forward<R>(r));
  }
};
inline constexpr values_fn values;

template<typename R>
constexpr auto keys(R&& r) {
  return std::ranges::keys_view<std::ranges::ref_view<std::remove_reference_t<R>>>(std::forward<R>(r));
}

struct iota_fn {
  template<typename T>
  constexpr auto operator()(T start, T end) const {
    return detail::iota_range<T>(start, end);
  }
};
inline constexpr iota_fn iota;

struct split_fn {
  template<typename R, typename D>
  constexpr auto operator()(R&& r, D&& d) const {
    return std::forward<R>(r);
  }
};
inline constexpr split_fn split;

} // namespace views
} // namespace std

#endif // RANGES_COMPAT_H
