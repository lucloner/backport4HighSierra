var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// node_modules/@lezer/common/dist/index.js
function checkSide(side, pos, from, to) {
  switch (side) {
    case -2:
      return from < pos;
    case -1:
      return to >= pos && from < pos;
    case 0:
      return from < pos && to > pos;
    case 1:
      return from <= pos && to > pos;
    case 2:
      return to > pos;
    case 4:
      return true;
  }
}
function resolveNode(node, pos, side, overlays) {
  var _a;
  while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
    let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
    if (!parent)
      return node;
    node = parent;
  }
  let mode = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a = parent.enter(pos, side, mode)) === null || _a === void 0 ? void 0 : _a.from) != scan.from)
        node = parent;
    }
  for (; ; ) {
    let inner = node.enter(pos, side, mode);
    if (!inner)
      return node;
    node = inner;
  }
}
function getChildren(node, type, before, after) {
  let cur = node.cursor(), result = [];
  if (!cur.firstChild())
    return result;
  if (before != null)
    for (let found = false; !found; ) {
      found = cur.type.is(before);
      if (!cur.nextSibling())
        return result;
    }
  for (; ; ) {
    if (after != null && cur.type.is(after))
      return result;
    if (cur.type.is(type))
      result.push(cur.node);
    if (!cur.nextSibling())
      return after == null ? result : [];
  }
}
function matchNodeContext(node, context, i = context.length - 1) {
  for (let p = node; i >= 0; p = p.parent) {
    if (!p)
      return false;
    if (!p.type.isAnonymous) {
      if (context[i] && context[i] != p.name)
        return false;
      i--;
    }
  }
  return true;
}
function iterStack(heads) {
  if (!heads.length)
    return null;
  let pick = 0, picked = heads[0];
  for (let i = 1; i < heads.length; i++) {
    let node = heads[i];
    if (node.from > picked.from || node.to < picked.to) {
      picked = node;
      pick = i;
    }
  }
  let next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
  let newHeads = heads.slice();
  if (next)
    newHeads[pick] = next;
  else
    newHeads.splice(pick, 1);
  return new StackIterator(newHeads, picked);
}
function stackIterator(tree, pos, side) {
  let inner = tree.resolveInner(pos, side), layers = null;
  for (let scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
    if (scan.index < 0) {
      let parent = scan.parent;
      (layers || (layers = [inner])).push(parent.resolve(pos, side));
      scan = parent;
    } else {
      let mount = MountedTree.get(scan.tree);
      if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
        let root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
        (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
      }
    }
  }
  return layers ? iterStack(layers) : inner;
}
function hasChild(tree) {
  return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
function buildTree(data) {
  var _a;
  let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
  let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
  let types = nodeSet.types;
  let contextHash = 0, lookAhead = 0;
  function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
    let { id, start: start2, end, size } = cursor;
    let lookAheadAtStart = lookAhead, contextAtStart = contextHash;
    if (size < 0) {
      cursor.next();
      if (size == -1) {
        let node2 = reused[id];
        children2.push(node2);
        positions2.push(start2 - parentStart);
        return;
      } else if (size == -3) {
        contextHash = id;
        return;
      } else if (size == -4) {
        lookAhead = id;
        return;
      } else {
        throw new RangeError(`Unrecognized record size: ${size}`);
      }
    }
    let type = types[id], node, buffer2;
    let startPos = start2 - parentStart;
    if (end - start2 <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
      let data2 = new Uint16Array(buffer2.size - buffer2.skip);
      let endPos = cursor.pos - buffer2.size, index = data2.length;
      while (cursor.pos > endPos)
        index = copyToBuffer(buffer2.start, data2, index);
      node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
      startPos = buffer2.start - parentStart;
    } else {
      let endPos = cursor.pos - size;
      cursor.next();
      let localChildren = [], localPositions = [];
      let localInRepeat = id >= minRepeatType ? id : -1;
      let lastGroup = 0, lastEnd = end;
      while (cursor.pos > endPos) {
        if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
          if (cursor.end <= lastEnd - maxBufferLength) {
            makeRepeatLeaf(localChildren, localPositions, start2, lastGroup, cursor.end, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
            lastGroup = localChildren.length;
            lastEnd = cursor.end;
          }
          cursor.next();
        } else if (depth > 2500) {
          takeFlatNode(start2, endPos, localChildren, localPositions);
        } else {
          takeNode(start2, endPos, localChildren, localPositions, localInRepeat, depth + 1);
        }
      }
      if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
        makeRepeatLeaf(localChildren, localPositions, start2, lastGroup, start2, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
      localChildren.reverse();
      localPositions.reverse();
      if (localInRepeat > -1 && lastGroup > 0) {
        let make = makeBalanced(type, contextAtStart);
        node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start2, make, make);
      } else {
        node = makeTree(type, localChildren, localPositions, end - start2, lookAheadAtStart - end, contextAtStart);
      }
    }
    children2.push(node);
    positions2.push(startPos);
  }
  function takeFlatNode(parentStart, minPos, children2, positions2) {
    let nodes = [];
    let nodeCount = 0, stopAt = -1;
    while (cursor.pos > minPos) {
      let { id, start: start2, end, size } = cursor;
      if (size > 4) {
        cursor.next();
      } else if (stopAt > -1 && start2 < stopAt) {
        break;
      } else {
        if (stopAt < 0)
          stopAt = end - maxBufferLength;
        nodes.push(id, start2, end);
        nodeCount++;
        cursor.next();
      }
    }
    if (nodeCount) {
      let buffer2 = new Uint16Array(nodeCount * 4);
      let start2 = nodes[nodes.length - 2];
      for (let i = nodes.length - 3, j = 0; i >= 0; i -= 3) {
        buffer2[j++] = nodes[i];
        buffer2[j++] = nodes[i + 1] - start2;
        buffer2[j++] = nodes[i + 2] - start2;
        buffer2[j++] = j;
      }
      children2.push(new TreeBuffer(buffer2, nodes[2] - start2, nodeSet));
      positions2.push(start2 - parentStart);
    }
  }
  function makeBalanced(type, contextHash2) {
    return (children2, positions2, length2) => {
      let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
      if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
        if (!lastI && last.type == type && last.length == length2)
          return last;
        if (lookAheadProp = last.prop(NodeProp.lookAhead))
          lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
      }
      return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
    };
  }
  function makeRepeatLeaf(children2, positions2, base, i, from, to, type, lookAhead2, contextHash2) {
    let localChildren = [], localPositions = [];
    while (children2.length > i) {
      localChildren.push(children2.pop());
      localPositions.push(positions2.pop() + base - from);
    }
    children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
    positions2.push(from - base);
  }
  function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
    if (contextHash2) {
      let pair2 = [NodeProp.contextHash, contextHash2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    if (lookAhead2 > 25) {
      let pair2 = [NodeProp.lookAhead, lookAhead2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    return new Tree(type, children2, positions2, length2, props);
  }
  function findBufferSize(maxSize, inRepeat) {
    let fork = cursor.fork();
    let size = 0, start2 = 0, skip = 0, minStart = fork.end - maxBufferLength;
    let result = { size: 0, start: 0, skip: 0 };
    scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
      let nodeSize2 = fork.size;
      if (fork.id == inRepeat && nodeSize2 >= 0) {
        result.size = size;
        result.start = start2;
        result.skip = skip;
        skip += 4;
        size += 4;
        fork.next();
        continue;
      }
      let startPos = fork.pos - nodeSize2;
      if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
        break;
      let localSkipped = fork.id >= minRepeatType ? 4 : 0;
      let nodeStart = fork.start;
      fork.next();
      while (fork.pos > startPos) {
        if (fork.size < 0) {
          if (fork.size == -3 || fork.size == -4)
            localSkipped += 4;
          else
            break scan;
        } else if (fork.id >= minRepeatType) {
          localSkipped += 4;
        }
        fork.next();
      }
      start2 = nodeStart;
      size += nodeSize2;
      skip += localSkipped;
    }
    if (inRepeat < 0 || size == maxSize) {
      result.size = size;
      result.start = start2;
      result.skip = skip;
    }
    return result.size > 4 ? result : void 0;
  }
  function copyToBuffer(bufferStart, buffer2, index) {
    let { id, start: start2, end, size } = cursor;
    cursor.next();
    if (size >= 0 && id < minRepeatType) {
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor.pos - (size - 4);
        while (cursor.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index);
      }
      buffer2[--index] = startIndex;
      buffer2[--index] = end - bufferStart;
      buffer2[--index] = start2 - bufferStart;
      buffer2[--index] = id;
    } else if (size == -3) {
      contextHash = id;
    } else if (size == -4) {
      lookAhead = id;
    }
    return index;
  }
  let children = [], positions = [];
  while (cursor.pos > 0)
    takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
  let length = (_a = data.length) !== null && _a !== void 0 ? _a : children.length ? positions[0] + children[0].length : 0;
  return new Tree(types[data.topID], children.reverse(), positions.reverse(), length);
}
function nodeSize(balanceType, node) {
  if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
    return 1;
  let size = nodeSizeCache.get(node);
  if (size == null) {
    size = 1;
    for (let child of node.children) {
      if (child.type != balanceType || !(child instanceof Tree)) {
        size = 1;
        break;
      }
      size += nodeSize(balanceType, child);
    }
    nodeSizeCache.set(node, size);
  }
  return size;
}
function balanceRange(balanceType, children, positions, from, to, start2, length, mkTop, mkTree) {
  let total = 0;
  for (let i = from; i < to; i++)
    total += nodeSize(balanceType, children[i]);
  let maxChild = Math.ceil(
    total * 1.5 / 8
    /* Balance.BranchFactor */
  );
  let localChildren = [], localPositions = [];
  function divide(children2, positions2, from2, to2, offset) {
    for (let i = from2; i < to2; ) {
      let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
      i++;
      for (; i < to2; i++) {
        let nextSize = nodeSize(balanceType, children2[i]);
        if (groupSize + nextSize >= maxChild)
          break;
        groupSize += nextSize;
      }
      if (i == groupFrom + 1) {
        if (groupSize > maxChild) {
          let only = children2[groupFrom];
          divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
          continue;
        }
        localChildren.push(children2[groupFrom]);
      } else {
        let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
        localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
      }
      localPositions.push(groupStart + offset - start2);
    }
  }
  divide(children, positions, from, to, 0);
  return (mkTop || mkTree)(localChildren, localPositions, length);
}
var DefaultBufferLength, nextPropID, Range, NodeProp, MountedTree, noProps, NodeType, NodeSet, CachedNode, CachedInnerNode, IterMode, Tree, FlatBufferCursor, TreeBuffer, BaseNode, TreeNode, BufferContext, BufferNode, StackIterator, TreeCursor, nodeSizeCache, Parser, StringInput, stoppedInner;
var init_dist = __esm({
  "node_modules/@lezer/common/dist/index.js"() {
    DefaultBufferLength = 1024;
    nextPropID = 0;
    Range = class {
      constructor(from, to) {
        this.from = from;
        this.to = to;
      }
    };
    NodeProp = class {
      /**
      Create a new node prop type.
      */
      constructor(config = {}) {
        this.id = nextPropID++;
        this.perNode = !!config.perNode;
        this.deserialize = config.deserialize || (() => {
          throw new Error("This node type doesn't define a deserialize function");
        });
        this.combine = config.combine || null;
      }
      /**
      This is meant to be used with
      [`NodeSet.extend`](#common.NodeSet.extend) or
      [`LRParser.configure`](#lr.ParserConfig.props) to compute
      prop values for each node type in the set. Takes a [match
      object](#common.NodeType^match) or function that returns undefined
      if the node type doesn't get this prop, and the prop's value if
      it does.
      */
      add(match) {
        if (this.perNode)
          throw new RangeError("Can't add per-node props to node types");
        if (typeof match != "function")
          match = NodeType.match(match);
        return (type) => {
          let result = match(type);
          return result === void 0 ? null : [this, result];
        };
      }
    };
    NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
    NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
    NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
    NodeProp.isolate = new NodeProp({ deserialize: (value) => {
      if (value && value != "rtl" && value != "ltr" && value != "auto")
        throw new RangeError("Invalid value for isolate: " + value);
      return value || "auto";
    } });
    NodeProp.contextHash = new NodeProp({ perNode: true });
    NodeProp.lookAhead = new NodeProp({ perNode: true });
    NodeProp.mounted = new NodeProp({ perNode: true });
    MountedTree = class {
      constructor(tree, overlay, parser2, bracketed = false) {
        this.tree = tree;
        this.overlay = overlay;
        this.parser = parser2;
        this.bracketed = bracketed;
      }
      /**
      @internal
      */
      static get(tree) {
        return tree && tree.props && tree.props[NodeProp.mounted.id];
      }
    };
    noProps = /* @__PURE__ */ Object.create(null);
    NodeType = class _NodeType {
      /**
      @internal
      */
      constructor(name2, props, id, flags = 0) {
        this.name = name2;
        this.props = props;
        this.id = id;
        this.flags = flags;
      }
      /**
      Define a node type.
      */
      static define(spec) {
        let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
        let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
        let type = new _NodeType(spec.name || "", props, spec.id, flags);
        if (spec.props)
          for (let src of spec.props) {
            if (!Array.isArray(src))
              src = src(type);
            if (src) {
              if (src[0].perNode)
                throw new RangeError("Can't store a per-node prop on a node type");
              props[src[0].id] = src[1];
            }
          }
        return type;
      }
      /**
      Retrieves a node prop for this type. Will return `undefined` if
      the prop isn't present on this node.
      */
      prop(prop) {
        return this.props[prop.id];
      }
      /**
      True when this is the top node of a grammar.
      */
      get isTop() {
        return (this.flags & 1) > 0;
      }
      /**
      True when this node is produced by a skip rule.
      */
      get isSkipped() {
        return (this.flags & 2) > 0;
      }
      /**
      Indicates whether this is an error node.
      */
      get isError() {
        return (this.flags & 4) > 0;
      }
      /**
      When true, this node type doesn't correspond to a user-declared
      named node, for example because it is used to cache repetition.
      */
      get isAnonymous() {
        return (this.flags & 8) > 0;
      }
      /**
      Returns true when this node's name or one of its
      [groups](#common.NodeProp^group) matches the given string.
      */
      is(name2) {
        if (typeof name2 == "string") {
          if (this.name == name2)
            return true;
          let group = this.prop(NodeProp.group);
          return group ? group.indexOf(name2) > -1 : false;
        }
        return this.id == name2;
      }
      /**
      Create a function from node types to arbitrary values by
      specifying an object whose property names are node or
      [group](#common.NodeProp^group) names. Often useful with
      [`NodeProp.add`](#common.NodeProp.add). You can put multiple
      names, separated by spaces, in a single property name to map
      multiple node names to a single value.
      */
      static match(map) {
        let direct = /* @__PURE__ */ Object.create(null);
        for (let prop in map)
          for (let name2 of prop.split(" "))
            direct[name2] = map[prop];
        return (node) => {
          for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
            let found = direct[i < 0 ? node.name : groups[i]];
            if (found)
              return found;
          }
        };
      }
    };
    NodeType.none = new NodeType(
      "",
      /* @__PURE__ */ Object.create(null),
      0,
      8
      /* NodeFlag.Anonymous */
    );
    NodeSet = class _NodeSet {
      /**
      Create a set with the given types. The `id` property of each
      type should correspond to its position within the array.
      */
      constructor(types) {
        this.types = types;
        for (let i = 0; i < types.length; i++)
          if (types[i].id != i)
            throw new RangeError("Node type ids should correspond to array positions when creating a node set");
      }
      /**
      Create a copy of this set with some node properties added. The
      arguments to this method can be created with
      [`NodeProp.add`](#common.NodeProp.add).
      */
      extend(...props) {
        let newTypes = [];
        for (let type of this.types) {
          let newProps = null;
          for (let source of props) {
            let add = source(type);
            if (add) {
              if (!newProps)
                newProps = Object.assign({}, type.props);
              let value = add[1], prop = add[0];
              if (prop.combine && prop.id in newProps)
                value = prop.combine(newProps[prop.id], value);
              newProps[prop.id] = value;
            }
          }
          newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
        }
        return new _NodeSet(newTypes);
      }
    };
    CachedNode = /* @__PURE__ */ new WeakMap();
    CachedInnerNode = /* @__PURE__ */ new WeakMap();
    (function(IterMode2) {
      IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
      IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
      IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
      IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
      IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
    })(IterMode || (IterMode = {}));
    Tree = class _Tree {
      /**
      Construct a new tree. See also [`Tree.build`](#common.Tree^build).
      */
      constructor(type, children, positions, length, props) {
        this.type = type;
        this.children = children;
        this.positions = positions;
        this.length = length;
        this.props = null;
        if (props && props.length) {
          this.props = /* @__PURE__ */ Object.create(null);
          for (let [prop, value] of props)
            this.props[typeof prop == "number" ? prop : prop.id] = value;
        }
      }
      /**
      @internal
      */
      toString() {
        let mounted = MountedTree.get(this);
        if (mounted && !mounted.overlay)
          return mounted.tree.toString();
        let children = "";
        for (let ch of this.children) {
          let str = ch.toString();
          if (str) {
            if (children)
              children += ",";
            children += str;
          }
        }
        return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
      }
      /**
      Get a [tree cursor](#common.TreeCursor) positioned at the top of
      the tree. Mode can be used to [control](#common.IterMode) which
      nodes the cursor visits.
      */
      cursor(mode = 0) {
        return new TreeCursor(this.topNode, mode);
      }
      /**
      Get a [tree cursor](#common.TreeCursor) pointing into this tree
      at the given position and side (see
      [`moveTo`](#common.TreeCursor.moveTo).
      */
      cursorAt(pos, side = 0, mode = 0) {
        let scope = CachedNode.get(this) || this.topNode;
        let cursor = new TreeCursor(scope);
        cursor.moveTo(pos, side);
        CachedNode.set(this, cursor._tree);
        return cursor;
      }
      /**
      Get a [syntax node](#common.SyntaxNode) object for the top of the
      tree.
      */
      get topNode() {
        return new TreeNode(this, 0, 0, null);
      }
      /**
      Get the [syntax node](#common.SyntaxNode) at the given position.
      If `side` is -1, this will move into nodes that end at the
      position. If 1, it'll move into nodes that start at the
      position. With 0, it'll only enter nodes that cover the position
      from both sides.
      
      Note that this will not enter
      [overlays](#common.MountedTree.overlay), and you often want
      [`resolveInner`](#common.Tree.resolveInner) instead.
      */
      resolve(pos, side = 0) {
        let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
        CachedNode.set(this, node);
        return node;
      }
      /**
      Like [`resolve`](#common.Tree.resolve), but will enter
      [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
      pointing into the innermost overlaid tree at the given position
      (with parent links going through all parent structure, including
      the host trees).
      */
      resolveInner(pos, side = 0) {
        let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
        CachedInnerNode.set(this, node);
        return node;
      }
      /**
      In some situations, it can be useful to iterate through all
      nodes around a position, including those in overlays that don't
      directly cover the position. This method gives you an iterator
      that will produce all nodes, from small to big, around the given
      position.
      */
      resolveStack(pos, side = 0) {
        return stackIterator(this, pos, side);
      }
      /**
      Iterate over the tree and its children, calling `enter` for any
      node that touches the `from`/`to` region (if given) before
      running over such a node's children, and `leave` (if given) when
      leaving the node. When `enter` returns `false`, that node will
      not have its children iterated over (or `leave` called).
      */
      iterate(spec) {
        let { enter, leave, from = 0, to = this.length } = spec;
        let mode = spec.mode || 0, anon = (mode & IterMode.IncludeAnonymous) > 0;
        for (let c = this.cursor(mode | IterMode.IncludeAnonymous); ; ) {
          let entered = false;
          if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
            if (c.firstChild())
              continue;
            entered = true;
          }
          for (; ; ) {
            if (entered && leave && (anon || !c.type.isAnonymous))
              leave(c);
            if (c.nextSibling())
              break;
            if (!c.parent())
              return;
            entered = true;
          }
        }
      }
      /**
      Get the value of the given [node prop](#common.NodeProp) for this
      node. Works with both per-node and per-type props.
      */
      prop(prop) {
        return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
      }
      /**
      Returns the node's [per-node props](#common.NodeProp.perNode) in a
      format that can be passed to the [`Tree`](#common.Tree)
      constructor.
      */
      get propValues() {
        let result = [];
        if (this.props)
          for (let id in this.props)
            result.push([+id, this.props[id]]);
        return result;
      }
      /**
      Balance the direct children of this tree, producing a copy of
      which may have children grouped into subtrees with type
      [`NodeType.none`](#common.NodeType^none).
      */
      balance(config = {}) {
        return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new _Tree(this.type, children, positions, length, this.propValues), config.makeTree || ((children, positions, length) => new _Tree(NodeType.none, children, positions, length)));
      }
      /**
      Build a tree from a postfix-ordered buffer of node information,
      or a cursor over such a buffer.
      */
      static build(data) {
        return buildTree(data);
      }
    };
    Tree.empty = new Tree(NodeType.none, [], [], 0);
    FlatBufferCursor = class _FlatBufferCursor {
      constructor(buffer, index) {
        this.buffer = buffer;
        this.index = index;
      }
      get id() {
        return this.buffer[this.index - 4];
      }
      get start() {
        return this.buffer[this.index - 3];
      }
      get end() {
        return this.buffer[this.index - 2];
      }
      get size() {
        return this.buffer[this.index - 1];
      }
      get pos() {
        return this.index;
      }
      next() {
        this.index -= 4;
      }
      fork() {
        return new _FlatBufferCursor(this.buffer, this.index);
      }
    };
    TreeBuffer = class _TreeBuffer {
      /**
      Create a tree buffer.
      */
      constructor(buffer, length, set) {
        this.buffer = buffer;
        this.length = length;
        this.set = set;
      }
      /**
      @internal
      */
      get type() {
        return NodeType.none;
      }
      /**
      @internal
      */
      toString() {
        let result = [];
        for (let index = 0; index < this.buffer.length; ) {
          result.push(this.childString(index));
          index = this.buffer[index + 3];
        }
        return result.join(",");
      }
      /**
      @internal
      */
      childString(index) {
        let id = this.buffer[index], endIndex = this.buffer[index + 3];
        let type = this.set.types[id], result = type.name;
        if (/\W/.test(result) && !type.isError)
          result = JSON.stringify(result);
        index += 4;
        if (endIndex == index)
          return result;
        let children = [];
        while (index < endIndex) {
          children.push(this.childString(index));
          index = this.buffer[index + 3];
        }
        return result + "(" + children.join(",") + ")";
      }
      /**
      @internal
      */
      findChild(startIndex, endIndex, dir, pos, side) {
        let { buffer } = this, pick = -1;
        for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
          if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
            pick = i;
            if (dir > 0)
              break;
          }
        }
        return pick;
      }
      /**
      @internal
      */
      slice(startI, endI, from) {
        let b = this.buffer;
        let copy = new Uint16Array(endI - startI), len = 0;
        for (let i = startI, j = 0; i < endI; ) {
          copy[j++] = b[i++];
          copy[j++] = b[i++] - from;
          let to = copy[j++] = b[i++] - from;
          copy[j++] = b[i++] - startI;
          len = Math.max(len, to);
        }
        return new _TreeBuffer(copy, len, this.set);
      }
    };
    BaseNode = class {
      cursor(mode = 0) {
        return new TreeCursor(this, mode);
      }
      getChild(type, before = null, after = null) {
        let r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
      }
      getChildren(type, before = null, after = null) {
        return getChildren(this, type, before, after);
      }
      resolve(pos, side = 0) {
        return resolveNode(this, pos, side, false);
      }
      resolveInner(pos, side = 0) {
        return resolveNode(this, pos, side, true);
      }
      matchContext(context) {
        return matchNodeContext(this.parent, context);
      }
      enterUnfinishedNodesBefore(pos) {
        let scan = this.childBefore(pos), node = this;
        while (scan) {
          let last = scan.lastChild;
          if (!last || last.to != scan.to)
            break;
          if (last.type.isError && last.from == last.to) {
            node = scan;
            scan = last.prevSibling;
          } else {
            scan = last;
          }
        }
        return node;
      }
      get node() {
        return this;
      }
      get next() {
        return this.parent;
      }
    };
    TreeNode = class _TreeNode extends BaseNode {
      constructor(_tree, from, index, _parent) {
        super();
        this._tree = _tree;
        this.from = from;
        this.index = index;
        this._parent = _parent;
      }
      get type() {
        return this._tree.type;
      }
      get name() {
        return this._tree.type.name;
      }
      get to() {
        return this.from + this._tree.length;
      }
      nextChild(i, dir, pos, side, mode = 0) {
        for (let parent = this; ; ) {
          for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
            let next = children[i], start2 = positions[i] + parent.from, mounted;
            if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start2 && pos <= start2 + next.length) && !checkSide(side, pos, start2, start2 + next.length))
              continue;
            if (next instanceof TreeBuffer) {
              if (mode & IterMode.ExcludeBuffers)
                continue;
              let index = next.findChild(0, next.buffer.length, dir, pos - start2, side);
              if (index > -1)
                return new BufferNode(new BufferContext(parent, next, i, start2), null, index);
            } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
              let mounted2;
              if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay)
                return new _TreeNode(mounted2.tree, start2, i, parent);
              let inner = new _TreeNode(next, start2, i, parent);
              return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
            }
          }
          if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
            return null;
          if (parent.index >= 0)
            i = parent.index + dir;
          else
            i = dir < 0 ? -1 : parent._parent._tree.children.length;
          parent = parent._parent;
          if (!parent)
            return null;
        }
      }
      get firstChild() {
        return this.nextChild(
          0,
          1,
          0,
          4
          /* Side.DontCare */
        );
      }
      get lastChild() {
        return this.nextChild(
          this._tree.children.length - 1,
          -1,
          0,
          4
          /* Side.DontCare */
        );
      }
      childAfter(pos) {
        return this.nextChild(
          0,
          1,
          pos,
          2
          /* Side.After */
        );
      }
      childBefore(pos) {
        return this.nextChild(
          this._tree.children.length - 1,
          -1,
          pos,
          -2
          /* Side.Before */
        );
      }
      prop(prop) {
        return this._tree.prop(prop);
      }
      enter(pos, side, mode = 0) {
        let mounted;
        if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
          let rPos = pos - this.from, enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
          for (let { from, to } of mounted.overlay) {
            if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos))
              return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
          }
        }
        return this.nextChild(0, 1, pos, side, mode);
      }
      nextSignificantParent() {
        let val = this;
        while (val.type.isAnonymous && val._parent)
          val = val._parent;
        return val;
      }
      get parent() {
        return this._parent ? this._parent.nextSignificantParent() : null;
      }
      get nextSibling() {
        return this._parent && this.index >= 0 ? this._parent.nextChild(
          this.index + 1,
          1,
          0,
          4
          /* Side.DontCare */
        ) : null;
      }
      get prevSibling() {
        return this._parent && this.index >= 0 ? this._parent.nextChild(
          this.index - 1,
          -1,
          0,
          4
          /* Side.DontCare */
        ) : null;
      }
      get tree() {
        return this._tree;
      }
      toTree() {
        return this._tree;
      }
      /**
      @internal
      */
      toString() {
        return this._tree.toString();
      }
    };
    BufferContext = class {
      constructor(parent, buffer, index, start2) {
        this.parent = parent;
        this.buffer = buffer;
        this.index = index;
        this.start = start2;
      }
    };
    BufferNode = class _BufferNode extends BaseNode {
      get name() {
        return this.type.name;
      }
      get from() {
        return this.context.start + this.context.buffer.buffer[this.index + 1];
      }
      get to() {
        return this.context.start + this.context.buffer.buffer[this.index + 2];
      }
      constructor(context, _parent, index) {
        super();
        this.context = context;
        this._parent = _parent;
        this.index = index;
        this.type = context.buffer.set.types[context.buffer.buffer[index]];
      }
      child(dir, pos, side) {
        let { buffer } = this.context;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
        return index < 0 ? null : new _BufferNode(this.context, this, index);
      }
      get firstChild() {
        return this.child(
          1,
          0,
          4
          /* Side.DontCare */
        );
      }
      get lastChild() {
        return this.child(
          -1,
          0,
          4
          /* Side.DontCare */
        );
      }
      childAfter(pos) {
        return this.child(
          1,
          pos,
          2
          /* Side.After */
        );
      }
      childBefore(pos) {
        return this.child(
          -1,
          pos,
          -2
          /* Side.Before */
        );
      }
      prop(prop) {
        return this.type.prop(prop);
      }
      enter(pos, side, mode = 0) {
        if (mode & IterMode.ExcludeBuffers)
          return null;
        let { buffer } = this.context;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
        return index < 0 ? null : new _BufferNode(this.context, this, index);
      }
      get parent() {
        return this._parent || this.context.parent.nextSignificantParent();
      }
      externalSibling(dir) {
        return this._parent ? null : this.context.parent.nextChild(
          this.context.index + dir,
          dir,
          0,
          4
          /* Side.DontCare */
        );
      }
      get nextSibling() {
        let { buffer } = this.context;
        let after = buffer.buffer[this.index + 3];
        if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
          return new _BufferNode(this.context, this._parent, after);
        return this.externalSibling(1);
      }
      get prevSibling() {
        let { buffer } = this.context;
        let parentStart = this._parent ? this._parent.index + 4 : 0;
        if (this.index == parentStart)
          return this.externalSibling(-1);
        return new _BufferNode(this.context, this._parent, buffer.findChild(
          parentStart,
          this.index,
          -1,
          0,
          4
          /* Side.DontCare */
        ));
      }
      get tree() {
        return null;
      }
      toTree() {
        let children = [], positions = [];
        let { buffer } = this.context;
        let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
        if (endI > startI) {
          let from = buffer.buffer[this.index + 1];
          children.push(buffer.slice(startI, endI, from));
          positions.push(0);
        }
        return new Tree(this.type, children, positions, this.to - this.from);
      }
      /**
      @internal
      */
      toString() {
        return this.context.buffer.childString(this.index);
      }
    };
    StackIterator = class {
      constructor(heads, node) {
        this.heads = heads;
        this.node = node;
      }
      get next() {
        return iterStack(this.heads);
      }
    };
    TreeCursor = class {
      /**
      Shorthand for `.type.name`.
      */
      get name() {
        return this.type.name;
      }
      /**
      @internal
      */
      constructor(node, mode = 0) {
        this.buffer = null;
        this.stack = [];
        this.index = 0;
        this.bufferNode = null;
        this.mode = mode & ~IterMode.EnterBracketed;
        if (node instanceof TreeNode) {
          this.yieldNode(node);
        } else {
          this._tree = node.context.parent;
          this.buffer = node.context;
          for (let n = node._parent; n; n = n._parent)
            this.stack.unshift(n.index);
          this.bufferNode = node;
          this.yieldBuf(node.index);
        }
      }
      yieldNode(node) {
        if (!node)
          return false;
        this._tree = node;
        this.type = node.type;
        this.from = node.from;
        this.to = node.to;
        return true;
      }
      yieldBuf(index, type) {
        this.index = index;
        let { start: start2, buffer } = this.buffer;
        this.type = type || buffer.set.types[buffer.buffer[index]];
        this.from = start2 + buffer.buffer[index + 1];
        this.to = start2 + buffer.buffer[index + 2];
        return true;
      }
      /**
      @internal
      */
      yield(node) {
        if (!node)
          return false;
        if (node instanceof TreeNode) {
          this.buffer = null;
          return this.yieldNode(node);
        }
        this.buffer = node.context;
        return this.yieldBuf(node.index, node.type);
      }
      /**
      @internal
      */
      toString() {
        return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
      }
      /**
      @internal
      */
      enterChild(dir, pos, side) {
        if (!this.buffer)
          return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
        let { buffer } = this.buffer;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
        if (index < 0)
          return false;
        this.stack.push(this.index);
        return this.yieldBuf(index);
      }
      /**
      Move the cursor to this node's first child. When this returns
      false, the node has no child, and the cursor has not been moved.
      */
      firstChild() {
        return this.enterChild(
          1,
          0,
          4
          /* Side.DontCare */
        );
      }
      /**
      Move the cursor to this node's last child.
      */
      lastChild() {
        return this.enterChild(
          -1,
          0,
          4
          /* Side.DontCare */
        );
      }
      /**
      Move the cursor to the first child that ends after `pos`.
      */
      childAfter(pos) {
        return this.enterChild(
          1,
          pos,
          2
          /* Side.After */
        );
      }
      /**
      Move to the last child that starts before `pos`.
      */
      childBefore(pos) {
        return this.enterChild(
          -1,
          pos,
          -2
          /* Side.Before */
        );
      }
      /**
      Move the cursor to the child around `pos`. If side is -1 the
      child may end at that position, when 1 it may start there. This
      will also enter [overlaid](#common.MountedTree.overlay)
      [mounted](#common.NodeProp^mounted) trees unless `overlays` is
      set to false.
      */
      enter(pos, side, mode = this.mode) {
        if (!this.buffer)
          return this.yield(this._tree.enter(pos, side, mode));
        return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
      }
      /**
      Move to the node's parent node, if this isn't the top node.
      */
      parent() {
        if (!this.buffer)
          return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
        if (this.stack.length)
          return this.yieldBuf(this.stack.pop());
        let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
        this.buffer = null;
        return this.yieldNode(parent);
      }
      /**
      @internal
      */
      sibling(dir) {
        if (!this.buffer)
          return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
        let { buffer } = this.buffer, d = this.stack.length - 1;
        if (dir < 0) {
          let parentStart = d < 0 ? 0 : this.stack[d] + 4;
          if (this.index != parentStart)
            return this.yieldBuf(buffer.findChild(
              parentStart,
              this.index,
              -1,
              0,
              4
              /* Side.DontCare */
            ));
        } else {
          let after = buffer.buffer[this.index + 3];
          if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
            return this.yieldBuf(after);
        }
        return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
      }
      /**
      Move to this node's next sibling, if any.
      */
      nextSibling() {
        return this.sibling(1);
      }
      /**
      Move to this node's previous sibling, if any.
      */
      prevSibling() {
        return this.sibling(-1);
      }
      atLastNode(dir) {
        let index, parent, { buffer } = this;
        if (buffer) {
          if (dir > 0) {
            if (this.index < buffer.buffer.buffer.length)
              return false;
          } else {
            for (let i = 0; i < this.index; i++)
              if (buffer.buffer.buffer[i + 3] < this.index)
                return false;
          }
          ({ index, parent } = buffer);
        } else {
          ({ index, _parent: parent } = this._tree);
        }
        for (; parent; { index, _parent: parent } = parent) {
          if (index > -1)
            for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
              let child = parent._tree.children[i];
              if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
                return false;
            }
        }
        return true;
      }
      move(dir, enter) {
        if (enter && this.enterChild(
          dir,
          0,
          4
          /* Side.DontCare */
        ))
          return true;
        for (; ; ) {
          if (this.sibling(dir))
            return true;
          if (this.atLastNode(dir) || !this.parent())
            return false;
        }
      }
      /**
      Move to the next node in a
      [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
      traversal, going from a node to its first child or, if the
      current node is empty or `enter` is false, its next sibling or
      the next sibling of the first parent node that has one.
      */
      next(enter = true) {
        return this.move(1, enter);
      }
      /**
      Move to the next node in a last-to-first pre-order traversal. A
      node is followed by its last child or, if it has none, its
      previous sibling or the previous sibling of the first parent
      node that has one.
      */
      prev(enter = true) {
        return this.move(-1, enter);
      }
      /**
      Move the cursor to the innermost node that covers `pos`. If
      `side` is -1, it will enter nodes that end at `pos`. If it is 1,
      it will enter nodes that start at `pos`.
      */
      moveTo(pos, side = 0) {
        while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
          if (!this.parent())
            break;
        while (this.enterChild(1, pos, side)) {
        }
        return this;
      }
      /**
      Get a [syntax node](#common.SyntaxNode) at the cursor's current
      position.
      */
      get node() {
        if (!this.buffer)
          return this._tree;
        let cache = this.bufferNode, result = null, depth = 0;
        if (cache && cache.context == this.buffer) {
          scan: for (let index = this.index, d = this.stack.length; d >= 0; ) {
            for (let c = cache; c; c = c._parent)
              if (c.index == index) {
                if (index == this.index)
                  return c;
                result = c;
                depth = d + 1;
                break scan;
              }
            index = this.stack[--d];
          }
        }
        for (let i = depth; i < this.stack.length; i++)
          result = new BufferNode(this.buffer, result, this.stack[i]);
        return this.bufferNode = new BufferNode(this.buffer, result, this.index);
      }
      /**
      Get the [tree](#common.Tree) that represents the current node, if
      any. Will return null when the node is in a [tree
      buffer](#common.TreeBuffer).
      */
      get tree() {
        return this.buffer ? null : this._tree._tree;
      }
      /**
      Iterate over the current node and all its descendants, calling
      `enter` when entering a node and `leave`, if given, when leaving
      one. When `enter` returns `false`, any children of that node are
      skipped, and `leave` isn't called for it.
      */
      iterate(enter, leave) {
        for (let depth = 0; ; ) {
          let mustLeave = false;
          if (this.type.isAnonymous || enter(this) !== false) {
            if (this.firstChild()) {
              depth++;
              continue;
            }
            if (!this.type.isAnonymous)
              mustLeave = true;
          }
          for (; ; ) {
            if (mustLeave && leave)
              leave(this);
            mustLeave = this.type.isAnonymous;
            if (!depth)
              return;
            if (this.nextSibling())
              break;
            this.parent();
            depth--;
            mustLeave = true;
          }
        }
      }
      /**
      Test whether the current node matches a given context—a sequence
      of direct parent node names. Empty strings in the context array
      are treated as wildcards.
      */
      matchContext(context) {
        if (!this.buffer)
          return matchNodeContext(this.node.parent, context);
        let { buffer } = this.buffer, { types } = buffer.set;
        for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
          if (d < 0)
            return matchNodeContext(this._tree, context, i);
          let type = types[buffer.buffer[this.stack[d]]];
          if (!type.isAnonymous) {
            if (context[i] && context[i] != type.name)
              return false;
            i--;
          }
        }
        return true;
      }
    };
    nodeSizeCache = /* @__PURE__ */ new WeakMap();
    Parser = class {
      /**
      Start a parse, returning a [partial parse](#common.PartialParse)
      object. [`fragments`](#common.TreeFragment) can be passed in to
      make the parse incremental.
      
      By default, the entire input is parsed. You can pass `ranges`,
      which should be a sorted array of non-empty, non-overlapping
      ranges, to parse only those ranges. The tree returned in that
      case will start at `ranges[0].from`.
      */
      startParse(input, fragments, ranges) {
        if (typeof input == "string")
          input = new StringInput(input);
        ranges = !ranges ? [new Range(0, input.length)] : ranges.length ? ranges.map((r) => new Range(r.from, r.to)) : [new Range(0, 0)];
        return this.createParse(input, fragments || [], ranges);
      }
      /**
      Run a full parse, returning the resulting tree.
      */
      parse(input, fragments, ranges) {
        let parse = this.startParse(input, fragments, ranges);
        for (; ; ) {
          let done = parse.advance();
          if (done)
            return done;
        }
      }
    };
    StringInput = class {
      constructor(string2) {
        this.string = string2;
      }
      get length() {
        return this.string.length;
      }
      chunk(from) {
        return this.string.slice(from);
      }
      get lineChunks() {
        return false;
      }
      read(from, to) {
        return this.string.slice(from, to);
      }
    };
    stoppedInner = new NodeProp({ perNode: true });
  }
});

// node_modules/@lezer/lr/dist/index.js
function decodeArray(input, Type = Uint16Array) {
  if (typeof input != "string")
    return input;
  let array = null;
  for (let pos = 0, out = 0; pos < input.length; ) {
    let value = 0;
    for (; ; ) {
      let next = input.charCodeAt(pos++), stop = false;
      if (next == 126) {
        value = 65535;
        break;
      }
      if (next >= 92)
        next--;
      if (next >= 34)
        next--;
      let digit = next - 32;
      if (digit >= 46) {
        digit -= 46;
        stop = true;
      }
      value += digit;
      if (stop)
        break;
      value *= 46;
    }
    if (array)
      array[out++] = value;
    else
      array = new Type(value);
  }
  return array;
}
function readToken(data, input, stack, group, precTable, precOffset) {
  let state = 0, groupMask = 1 << group, { dialect } = stack.p.parser;
  scan: for (; ; ) {
    if ((groupMask & data[state]) == 0)
      break;
    let accEnd = data[state + 1];
    for (let i = state + 3; i < accEnd; i += 2)
      if ((data[i + 1] & groupMask) > 0) {
        let term = data[i];
        if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
          input.acceptToken(term);
          break;
        }
      }
    let next = input.next, low = 0, high = data[state + 2];
    if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
      state = data[accEnd + high * 3 - 1];
      continue scan;
    }
    for (; low < high; ) {
      let mid = low + high >> 1;
      let index = accEnd + mid + (mid << 1);
      let from = data[index], to = data[index + 1] || 65536;
      if (next < from)
        high = mid;
      else if (next >= to)
        low = mid + 1;
      else {
        state = data[index + 2];
        input.advance();
        continue scan;
      }
    }
    break;
  }
}
function findOffset(data, start2, term) {
  for (let i = start2, next; (next = data[i]) != 65535; i++)
    if (next == term)
      return i - start2;
  return -1;
}
function overrides(token, prev, tableData, tableOffset) {
  let iPrev = findOffset(tableData, tableOffset, prev);
  return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
}
function cutAt(tree, pos, side) {
  let cursor = tree.cursor(IterMode.IncludeAnonymous);
  cursor.moveTo(pos);
  for (; ; ) {
    if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
      for (; ; ) {
        if ((side < 0 ? cursor.to < pos : cursor.from > pos) && !cursor.type.isError)
          return side < 0 ? Math.max(0, Math.min(
            cursor.to - 1,
            pos - 25
            /* Lookahead.Margin */
          )) : Math.min(tree.length, Math.max(
            cursor.from + 1,
            pos + 25
            /* Lookahead.Margin */
          ));
        if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
          break;
        if (!cursor.parent())
          return side < 0 ? 0 : tree.length;
      }
  }
}
function pushStackDedup(stack, newStacks) {
  for (let i = 0; i < newStacks.length; i++) {
    let other = newStacks[i];
    if (other.pos == stack.pos && other.sameState(stack)) {
      if (newStacks[i].score < stack.score)
        newStacks[i] = stack;
      return;
    }
  }
  newStacks.push(stack);
}
function pair(data, off) {
  return data[off] | data[off + 1] << 16;
}
function findFinished(stacks) {
  let best = null;
  for (let stack of stacks) {
    let stopped = stack.p.stoppedAt;
    if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(
      stack.state,
      2
      /* StateFlag.Accepting */
    ) && (!best || best.score < stack.score))
      best = stack;
  }
  return best;
}
function getSpecializer(spec) {
  if (spec.external) {
    let mask = spec.extend ? 1 : 0;
    return (value, stack) => spec.external(value, stack) << 1 | mask;
  }
  return spec.get;
}
var Stack, StackContext, SimulatedStack, StackBufferCursor, CachedToken, nullToken, InputStream, TokenGroup, LocalTokenGroup, ExternalTokenizer, verbose, stackIDs, FragmentCursor, TokenCache, Parse, Dialect, LRParser;
var init_dist2 = __esm({
  "node_modules/@lezer/lr/dist/index.js"() {
    init_dist();
    Stack = class _Stack {
      /**
      @internal
      */
      constructor(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, lookAhead = 0, parent) {
        this.p = p;
        this.stack = stack;
        this.state = state;
        this.reducePos = reducePos;
        this.pos = pos;
        this.score = score;
        this.buffer = buffer;
        this.bufferBase = bufferBase;
        this.curContext = curContext;
        this.lookAhead = lookAhead;
        this.parent = parent;
      }
      /**
      @internal
      */
      toString() {
        return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
      }
      // Start an empty stack
      /**
      @internal
      */
      static start(p, state, pos = 0) {
        let cx = p.parser.context;
        return new _Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
      }
      /**
      The stack's current [context](#lr.ContextTracker) value, if
      any. Its type will depend on the context tracker's type
      parameter, or it will be `null` if there is no context
      tracker.
      */
      get context() {
        return this.curContext ? this.curContext.context : null;
      }
      // Push a state onto the stack, tracking its start position as well
      // as the buffer base at that point.
      /**
      @internal
      */
      pushState(state, start2) {
        this.stack.push(this.state, start2, this.bufferBase + this.buffer.length);
        this.state = state;
      }
      // Apply a reduce action
      /**
      @internal
      */
      reduce(action) {
        var _a;
        let depth = action >> 19, type = action & 65535;
        let { parser: parser2 } = this.p;
        let lookaheadRecord = this.reducePos < this.pos - 25 && this.setLookAhead(this.pos);
        let dPrec = parser2.dynamicPrecedence(type);
        if (dPrec)
          this.score += dPrec;
        if (depth == 0) {
          if (type < parser2.minRepeatTerm && this.reducePos < this.pos)
            this.reducePos = this.pos;
          this.pushState(parser2.getGoto(this.state, type, true), this.reducePos);
          if (type < parser2.minRepeatTerm)
            this.storeNode(type, this.reducePos, this.reducePos, lookaheadRecord ? 8 : 4, true);
          this.reduceContext(type, this.reducePos);
          return;
        }
        let base = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
        let start2 = base ? this.stack[base - 2] : this.p.ranges[0].from;
        if (type < parser2.minRepeatTerm && start2 == this.reducePos && this.reducePos < this.pos)
          this.reducePos = this.pos;
        let size = this.reducePos - start2;
        if (size >= 2e3 && !((_a = this.p.parser.nodeSet.types[type]) === null || _a === void 0 ? void 0 : _a.isAnonymous)) {
          if (start2 == this.p.lastBigReductionStart) {
            this.p.bigReductionCount++;
            this.p.lastBigReductionSize = size;
          } else if (this.p.lastBigReductionSize < size) {
            this.p.bigReductionCount = 1;
            this.p.lastBigReductionStart = start2;
            this.p.lastBigReductionSize = size;
          }
        }
        let bufferBase = base ? this.stack[base - 1] : 0, count = this.bufferBase + this.buffer.length - bufferBase;
        if (type < parser2.minRepeatTerm || action & 131072) {
          let pos = parser2.stateFlag(
            this.state,
            1
            /* StateFlag.Skipped */
          ) ? this.pos : this.reducePos;
          this.storeNode(type, start2, pos, count + 4, true);
        }
        if (action & 262144) {
          this.state = this.stack[base];
        } else {
          let baseStateID = this.stack[base - 3];
          this.state = parser2.getGoto(baseStateID, type, true);
        }
        while (this.stack.length > base)
          this.stack.pop();
        this.reduceContext(type, start2);
      }
      // Shift a value into the buffer
      /**
      @internal
      */
      storeNode(term, start2, end, size = 4, mustSink = false) {
        if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
          let top = this.buffer.length;
          if (top > 0 && this.buffer[top - 4] == 0 && this.buffer[top - 1] > -1) {
            if (start2 == end)
              return;
            if (this.buffer[top - 2] >= start2) {
              this.buffer[top - 2] = end;
              return;
            }
          }
        }
        if (!mustSink || this.pos == end) {
          this.buffer.push(term, start2, end, size);
        } else {
          let index = this.buffer.length;
          if (index > 0 && (this.buffer[index - 4] != 0 || this.buffer[index - 1] < 0)) {
            let mustMove = false;
            for (let scan = index; scan > 0 && this.buffer[scan - 2] > end; scan -= 4) {
              if (this.buffer[scan - 1] >= 0) {
                mustMove = true;
                break;
              }
            }
            if (mustMove)
              while (index > 0 && this.buffer[index - 2] > end) {
                this.buffer[index] = this.buffer[index - 4];
                this.buffer[index + 1] = this.buffer[index - 3];
                this.buffer[index + 2] = this.buffer[index - 2];
                this.buffer[index + 3] = this.buffer[index - 1];
                index -= 4;
                if (size > 4)
                  size -= 4;
              }
          }
          this.buffer[index] = term;
          this.buffer[index + 1] = start2;
          this.buffer[index + 2] = end;
          this.buffer[index + 3] = size;
        }
      }
      // Apply a shift action
      /**
      @internal
      */
      shift(action, type, start2, end) {
        if (action & 131072) {
          this.pushState(action & 65535, this.pos);
        } else if ((action & 262144) == 0) {
          let nextState = action, { parser: parser2 } = this.p;
          this.pos = end;
          let skipped = parser2.stateFlag(
            nextState,
            1
            /* StateFlag.Skipped */
          );
          if (!skipped && (end > start2 || type <= parser2.maxNode))
            this.reducePos = end;
          this.pushState(nextState, skipped ? start2 : Math.min(start2, this.reducePos));
          this.shiftContext(type, start2);
          if (type <= parser2.maxNode)
            this.buffer.push(type, start2, end, 4);
        } else {
          this.pos = end;
          this.shiftContext(type, start2);
          if (type <= this.p.parser.maxNode)
            this.buffer.push(type, start2, end, 4);
        }
      }
      // Apply an action
      /**
      @internal
      */
      apply(action, next, nextStart, nextEnd) {
        if (action & 65536)
          this.reduce(action);
        else
          this.shift(action, next, nextStart, nextEnd);
      }
      // Add a prebuilt (reused) node into the buffer.
      /**
      @internal
      */
      useNode(value, next) {
        let index = this.p.reused.length - 1;
        if (index < 0 || this.p.reused[index] != value) {
          this.p.reused.push(value);
          index++;
        }
        let start2 = this.pos;
        this.reducePos = this.pos = start2 + value.length;
        this.pushState(next, start2);
        this.buffer.push(
          index,
          start2,
          this.reducePos,
          -1
          /* size == -1 means this is a reused value */
        );
        if (this.curContext)
          this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
      }
      // Split the stack. Due to the buffer sharing and the fact
      // that `this.stack` tends to stay quite shallow, this isn't very
      // expensive.
      /**
      @internal
      */
      split() {
        let parent = this;
        let off = parent.buffer.length;
        if (off && parent.buffer[off - 4] == 0)
          off -= 4;
        while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
          off -= 4;
        let buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
        while (parent && base == parent.bufferBase)
          parent = parent.parent;
        return new _Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base, this.curContext, this.lookAhead, parent);
      }
      // Try to recover from an error by 'deleting' (ignoring) one token.
      /**
      @internal
      */
      recoverByDelete(next, nextEnd) {
        let isNode = next <= this.p.parser.maxNode;
        if (isNode)
          this.storeNode(next, this.pos, nextEnd, 4);
        this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
        this.pos = this.reducePos = nextEnd;
        this.score -= 190;
      }
      /**
      Check if the given term would be able to be shifted (optionally
      after some reductions) on this stack. This can be useful for
      external tokenizers that want to make sure they only provide a
      given token when it applies.
      */
      canShift(term) {
        for (let sim = new SimulatedStack(this); ; ) {
          let action = this.p.parser.stateSlot(
            sim.state,
            4
            /* ParseState.DefaultReduce */
          ) || this.p.parser.hasAction(sim.state, term);
          if (action == 0)
            return false;
          if ((action & 65536) == 0)
            return true;
          sim.reduce(action);
        }
      }
      // Apply up to Recover.MaxNext recovery actions that conceptually
      // inserts some missing token or rule.
      /**
      @internal
      */
      recoverByInsert(next) {
        if (this.stack.length >= 300)
          return [];
        let nextStates = this.p.parser.nextStates(this.state);
        if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
          let best = [];
          for (let i = 0, s; i < nextStates.length; i += 2) {
            if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next))
              best.push(nextStates[i], s);
          }
          if (this.stack.length < 120)
            for (let i = 0; best.length < 4 << 1 && i < nextStates.length; i += 2) {
              let s = nextStates[i + 1];
              if (!best.some((v, i2) => i2 & 1 && v == s))
                best.push(nextStates[i], s);
            }
          nextStates = best;
        }
        let result = [];
        for (let i = 0; i < nextStates.length && result.length < 4; i += 2) {
          let s = nextStates[i + 1];
          if (s == this.state)
            continue;
          let stack = this.split();
          stack.pushState(s, this.pos);
          stack.storeNode(0, stack.pos, stack.pos, 4, true);
          stack.shiftContext(nextStates[i], this.pos);
          stack.reducePos = this.pos;
          stack.score -= 200;
          result.push(stack);
        }
        return result;
      }
      // Force a reduce, if possible. Return false if that can't
      // be done.
      /**
      @internal
      */
      forceReduce() {
        let { parser: parser2 } = this.p;
        let reduce = parser2.stateSlot(
          this.state,
          5
          /* ParseState.ForcedReduce */
        );
        if ((reduce & 65536) == 0)
          return false;
        if (!parser2.validAction(this.state, reduce)) {
          let depth = reduce >> 19, term = reduce & 65535;
          let target = this.stack.length - depth * 3;
          if (target < 0 || parser2.getGoto(this.stack[target], term, false) < 0) {
            let backup = this.findForcedReduction();
            if (backup == null)
              return false;
            reduce = backup;
          }
          this.storeNode(0, this.pos, this.pos, 4, true);
          this.score -= 100;
        }
        this.reducePos = this.pos;
        this.reduce(reduce);
        return true;
      }
      /**
      Try to scan through the automaton to find some kind of reduction
      that can be applied. Used when the regular ForcedReduce field
      isn't a valid action. @internal
      */
      findForcedReduction() {
        let { parser: parser2 } = this.p, seen = [];
        let explore = (state, depth) => {
          if (seen.includes(state))
            return;
          seen.push(state);
          return parser2.allActions(state, (action) => {
            if (action & (262144 | 131072)) ;
            else if (action & 65536) {
              let rDepth = (action >> 19) - depth;
              if (rDepth > 1) {
                let term = action & 65535, target = this.stack.length - rDepth * 3;
                if (target >= 0 && parser2.getGoto(this.stack[target], term, false) >= 0)
                  return rDepth << 19 | 65536 | term;
              }
            } else {
              let found = explore(action, depth + 1);
              if (found != null)
                return found;
            }
          });
        };
        return explore(this.state, 0);
      }
      /**
      @internal
      */
      forceAll() {
        while (!this.p.parser.stateFlag(
          this.state,
          2
          /* StateFlag.Accepting */
        )) {
          if (!this.forceReduce()) {
            this.storeNode(0, this.pos, this.pos, 4, true);
            break;
          }
        }
        return this;
      }
      /**
      Check whether this state has no further actions (assumed to be a direct descendant of the
      top state, since any other states must be able to continue
      somehow). @internal
      */
      get deadEnd() {
        if (this.stack.length != 3)
          return false;
        let { parser: parser2 } = this.p;
        return parser2.data[parser2.stateSlot(
          this.state,
          1
          /* ParseState.Actions */
        )] == 65535 && !parser2.stateSlot(
          this.state,
          4
          /* ParseState.DefaultReduce */
        );
      }
      /**
      Restart the stack (put it back in its start state). Only safe
      when this.stack.length == 3 (state is directly below the top
      state). @internal
      */
      restart() {
        this.storeNode(0, this.pos, this.pos, 4, true);
        this.state = this.stack[0];
        this.stack.length = 0;
      }
      /**
      @internal
      */
      sameState(other) {
        if (this.state != other.state || this.stack.length != other.stack.length)
          return false;
        for (let i = 0; i < this.stack.length; i += 3)
          if (this.stack[i] != other.stack[i])
            return false;
        return true;
      }
      /**
      Get the parser used by this stack.
      */
      get parser() {
        return this.p.parser;
      }
      /**
      Test whether a given dialect (by numeric ID, as exported from
      the terms file) is enabled.
      */
      dialectEnabled(dialectID) {
        return this.p.parser.dialect.flags[dialectID];
      }
      shiftContext(term, start2) {
        if (this.curContext)
          this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start2)));
      }
      reduceContext(term, start2) {
        if (this.curContext)
          this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start2)));
      }
      /**
      @internal
      */
      emitContext() {
        let last = this.buffer.length - 1;
        if (last < 0 || this.buffer[last] != -3)
          this.buffer.push(this.curContext.hash, this.pos, this.pos, -3);
      }
      /**
      @internal
      */
      emitLookAhead() {
        let last = this.buffer.length - 1;
        if (last < 0 || this.buffer[last] != -4)
          this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
      }
      updateContext(context) {
        if (context != this.curContext.context) {
          let newCx = new StackContext(this.curContext.tracker, context);
          if (newCx.hash != this.curContext.hash)
            this.emitContext();
          this.curContext = newCx;
        }
      }
      /**
      @internal
      */
      setLookAhead(lookAhead) {
        if (lookAhead <= this.lookAhead)
          return false;
        this.emitLookAhead();
        this.lookAhead = lookAhead;
        return true;
      }
      /**
      @internal
      */
      close() {
        if (this.curContext && this.curContext.tracker.strict)
          this.emitContext();
        if (this.lookAhead > 0)
          this.emitLookAhead();
      }
    };
    StackContext = class {
      constructor(tracker, context) {
        this.tracker = tracker;
        this.context = context;
        this.hash = tracker.strict ? tracker.hash(context) : 0;
      }
    };
    SimulatedStack = class {
      constructor(start2) {
        this.start = start2;
        this.state = start2.state;
        this.stack = start2.stack;
        this.base = this.stack.length;
      }
      reduce(action) {
        let term = action & 65535, depth = action >> 19;
        if (depth == 0) {
          if (this.stack == this.start.stack)
            this.stack = this.stack.slice();
          this.stack.push(this.state, 0, 0);
          this.base += 3;
        } else {
          this.base -= (depth - 1) * 3;
        }
        let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
        this.state = goto;
      }
    };
    StackBufferCursor = class _StackBufferCursor {
      constructor(stack, pos, index) {
        this.stack = stack;
        this.pos = pos;
        this.index = index;
        this.buffer = stack.buffer;
        if (this.index == 0)
          this.maybeNext();
      }
      static create(stack, pos = stack.bufferBase + stack.buffer.length) {
        return new _StackBufferCursor(stack, pos, pos - stack.bufferBase);
      }
      maybeNext() {
        let next = this.stack.parent;
        if (next != null) {
          this.index = this.stack.bufferBase - next.bufferBase;
          this.stack = next;
          this.buffer = next.buffer;
        }
      }
      get id() {
        return this.buffer[this.index - 4];
      }
      get start() {
        return this.buffer[this.index - 3];
      }
      get end() {
        return this.buffer[this.index - 2];
      }
      get size() {
        return this.buffer[this.index - 1];
      }
      next() {
        this.index -= 4;
        this.pos -= 4;
        if (this.index == 0)
          this.maybeNext();
      }
      fork() {
        return new _StackBufferCursor(this.stack, this.pos, this.index);
      }
    };
    CachedToken = class {
      constructor() {
        this.start = -1;
        this.value = -1;
        this.end = -1;
        this.extended = -1;
        this.lookAhead = 0;
        this.mask = 0;
        this.context = 0;
      }
    };
    nullToken = new CachedToken();
    InputStream = class {
      /**
      @internal
      */
      constructor(input, ranges) {
        this.input = input;
        this.ranges = ranges;
        this.chunk = "";
        this.chunkOff = 0;
        this.chunk2 = "";
        this.chunk2Pos = 0;
        this.next = -1;
        this.token = nullToken;
        this.rangeIndex = 0;
        this.pos = this.chunkPos = ranges[0].from;
        this.range = ranges[0];
        this.end = ranges[ranges.length - 1].to;
        this.readNext();
      }
      /**
      @internal
      */
      resolveOffset(offset, assoc) {
        let range = this.range, index = this.rangeIndex;
        let pos = this.pos + offset;
        while (pos < range.from) {
          if (!index)
            return null;
          let next = this.ranges[--index];
          pos -= range.from - next.to;
          range = next;
        }
        while (assoc < 0 ? pos > range.to : pos >= range.to) {
          if (index == this.ranges.length - 1)
            return null;
          let next = this.ranges[++index];
          pos += next.from - range.to;
          range = next;
        }
        return pos;
      }
      /**
      @internal
      */
      clipPos(pos) {
        if (pos >= this.range.from && pos < this.range.to)
          return pos;
        for (let range of this.ranges)
          if (range.to > pos)
            return Math.max(pos, range.from);
        return this.end;
      }
      /**
      Look at a code unit near the stream position. `.peek(0)` equals
      `.next`, `.peek(-1)` gives you the previous character, and so
      on.
      
      Note that looking around during tokenizing creates dependencies
      on potentially far-away content, which may reduce the
      effectiveness incremental parsing—when looking forward—or even
      cause invalid reparses when looking backward more than 25 code
      units, since the library does not track lookbehind.
      */
      peek(offset) {
        let idx = this.chunkOff + offset, pos, result;
        if (idx >= 0 && idx < this.chunk.length) {
          pos = this.pos + offset;
          result = this.chunk.charCodeAt(idx);
        } else {
          let resolved = this.resolveOffset(offset, 1);
          if (resolved == null)
            return -1;
          pos = resolved;
          if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
            result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
          } else {
            let i = this.rangeIndex, range = this.range;
            while (range.to <= pos)
              range = this.ranges[++i];
            this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
            if (pos + this.chunk2.length > range.to)
              this.chunk2 = this.chunk2.slice(0, range.to - pos);
            result = this.chunk2.charCodeAt(0);
          }
        }
        if (pos >= this.token.lookAhead)
          this.token.lookAhead = pos + 1;
        return result;
      }
      /**
      Accept a token. By default, the end of the token is set to the
      current stream position, but you can pass an offset (relative to
      the stream position) to change that.
      */
      acceptToken(token, endOffset = 0) {
        let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
        if (end == null || end < this.token.start)
          throw new RangeError("Token end out of bounds");
        this.token.value = token;
        this.token.end = end;
      }
      /**
      Accept a token ending at a specific given position.
      */
      acceptTokenTo(token, endPos) {
        this.token.value = token;
        this.token.end = endPos;
      }
      getChunk() {
        if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
          let { chunk, chunkPos } = this;
          this.chunk = this.chunk2;
          this.chunkPos = this.chunk2Pos;
          this.chunk2 = chunk;
          this.chunk2Pos = chunkPos;
          this.chunkOff = this.pos - this.chunkPos;
        } else {
          this.chunk2 = this.chunk;
          this.chunk2Pos = this.chunkPos;
          let nextChunk = this.input.chunk(this.pos);
          let end = this.pos + nextChunk.length;
          this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
          this.chunkPos = this.pos;
          this.chunkOff = 0;
        }
      }
      readNext() {
        if (this.chunkOff >= this.chunk.length) {
          this.getChunk();
          if (this.chunkOff == this.chunk.length)
            return this.next = -1;
        }
        return this.next = this.chunk.charCodeAt(this.chunkOff);
      }
      /**
      Move the stream forward N (defaults to 1) code units. Returns
      the new value of [`next`](#lr.InputStream.next).
      */
      advance(n = 1) {
        this.chunkOff += n;
        while (this.pos + n >= this.range.to) {
          if (this.rangeIndex == this.ranges.length - 1)
            return this.setDone();
          n -= this.range.to - this.pos;
          this.range = this.ranges[++this.rangeIndex];
          this.pos = this.range.from;
        }
        this.pos += n;
        if (this.pos >= this.token.lookAhead)
          this.token.lookAhead = this.pos + 1;
        return this.readNext();
      }
      setDone() {
        this.pos = this.chunkPos = this.end;
        this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
        this.chunk = "";
        return this.next = -1;
      }
      /**
      @internal
      */
      reset(pos, token) {
        if (token) {
          this.token = token;
          token.start = pos;
          token.lookAhead = pos + 1;
          token.value = token.extended = -1;
        } else {
          this.token = nullToken;
        }
        if (this.pos != pos) {
          this.pos = pos;
          if (pos == this.end) {
            this.setDone();
            return this;
          }
          while (pos < this.range.from)
            this.range = this.ranges[--this.rangeIndex];
          while (pos >= this.range.to)
            this.range = this.ranges[++this.rangeIndex];
          if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
            this.chunkOff = pos - this.chunkPos;
          } else {
            this.chunk = "";
            this.chunkOff = 0;
          }
          this.readNext();
        }
        return this;
      }
      /**
      @internal
      */
      read(from, to) {
        if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
          return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
        if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
          return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
        if (from >= this.range.from && to <= this.range.to)
          return this.input.read(from, to);
        let result = "";
        for (let r of this.ranges) {
          if (r.from >= to)
            break;
          if (r.to > from)
            result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
        }
        return result;
      }
    };
    TokenGroup = class {
      constructor(data, id) {
        this.data = data;
        this.id = id;
      }
      token(input, stack) {
        let { parser: parser2 } = stack.p;
        readToken(this.data, input, stack, this.id, parser2.data, parser2.tokenPrecTable);
      }
    };
    TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
    LocalTokenGroup = class {
      constructor(data, precTable, elseToken) {
        this.precTable = precTable;
        this.elseToken = elseToken;
        this.data = typeof data == "string" ? decodeArray(data) : data;
      }
      token(input, stack) {
        let start2 = input.pos, skipped = 0;
        for (; ; ) {
          let atEof = input.next < 0, nextPos = input.resolveOffset(1, 1);
          readToken(this.data, input, stack, 0, this.data, this.precTable);
          if (input.token.value > -1)
            break;
          if (this.elseToken == null)
            return;
          if (!atEof)
            skipped++;
          if (nextPos == null)
            break;
          input.reset(nextPos, input.token);
        }
        if (skipped) {
          input.reset(start2, input.token);
          input.acceptToken(this.elseToken, skipped);
        }
      }
    };
    LocalTokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
    ExternalTokenizer = class {
      /**
      Create a tokenizer. The first argument is the function that,
      given an input stream, scans for the types of tokens it
      recognizes at the stream's position, and calls
      [`acceptToken`](#lr.InputStream.acceptToken) when it finds
      one.
      */
      constructor(token, options = {}) {
        this.token = token;
        this.contextual = !!options.contextual;
        this.fallback = !!options.fallback;
        this.extend = !!options.extend;
      }
    };
    verbose = typeof process != "undefined" && process.env && /\bparse\b/.test(process.env.LOG);
    stackIDs = null;
    FragmentCursor = class {
      constructor(fragments, nodeSet) {
        this.fragments = fragments;
        this.nodeSet = nodeSet;
        this.i = 0;
        this.fragment = null;
        this.safeFrom = -1;
        this.safeTo = -1;
        this.trees = [];
        this.start = [];
        this.index = [];
        this.nextFragment();
      }
      nextFragment() {
        let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
        if (fr) {
          this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
          this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
          while (this.trees.length) {
            this.trees.pop();
            this.start.pop();
            this.index.pop();
          }
          this.trees.push(fr.tree);
          this.start.push(-fr.offset);
          this.index.push(0);
          this.nextStart = this.safeFrom;
        } else {
          this.nextStart = 1e9;
        }
      }
      // `pos` must be >= any previously given `pos` for this cursor
      nodeAt(pos) {
        if (pos < this.nextStart)
          return null;
        while (this.fragment && this.safeTo <= pos)
          this.nextFragment();
        if (!this.fragment)
          return null;
        for (; ; ) {
          let last = this.trees.length - 1;
          if (last < 0) {
            this.nextFragment();
            return null;
          }
          let top = this.trees[last], index = this.index[last];
          if (index == top.children.length) {
            this.trees.pop();
            this.start.pop();
            this.index.pop();
            continue;
          }
          let next = top.children[index];
          let start2 = this.start[last] + top.positions[index];
          if (start2 > pos) {
            this.nextStart = start2;
            return null;
          }
          if (next instanceof Tree) {
            if (start2 == pos) {
              if (start2 < this.safeFrom)
                return null;
              let end = start2 + next.length;
              if (end <= this.safeTo) {
                let lookAhead = next.prop(NodeProp.lookAhead);
                if (!lookAhead || end + lookAhead < this.fragment.to)
                  return next;
              }
            }
            this.index[last]++;
            if (start2 + next.length >= Math.max(this.safeFrom, pos)) {
              this.trees.push(next);
              this.start.push(start2);
              this.index.push(0);
            }
          } else {
            this.index[last]++;
            this.nextStart = start2 + next.length;
          }
        }
      }
    };
    TokenCache = class {
      constructor(parser2, stream) {
        this.stream = stream;
        this.tokens = [];
        this.mainToken = null;
        this.actions = [];
        this.tokens = parser2.tokenizers.map((_) => new CachedToken());
      }
      getActions(stack) {
        let actionIndex = 0;
        let main2 = null;
        let { parser: parser2 } = stack.p, { tokenizers } = parser2;
        let mask = parser2.stateSlot(
          stack.state,
          3
          /* ParseState.TokenizerMask */
        );
        let context = stack.curContext ? stack.curContext.hash : 0;
        let lookAhead = 0;
        for (let i = 0; i < tokenizers.length; i++) {
          if ((1 << i & mask) == 0)
            continue;
          let tokenizer = tokenizers[i], token = this.tokens[i];
          if (main2 && !tokenizer.fallback)
            continue;
          if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
            this.updateCachedToken(token, tokenizer, stack);
            token.mask = mask;
            token.context = context;
          }
          if (token.lookAhead > token.end + 25)
            lookAhead = Math.max(token.lookAhead, lookAhead);
          if (token.value != 0) {
            let startIndex = actionIndex;
            if (token.extended > -1)
              actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
            actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
            if (!tokenizer.extend) {
              main2 = token;
              if (actionIndex > startIndex)
                break;
            }
          }
        }
        while (this.actions.length > actionIndex)
          this.actions.pop();
        if (lookAhead)
          stack.setLookAhead(lookAhead);
        if (!main2 && stack.pos == this.stream.end) {
          main2 = new CachedToken();
          main2.value = stack.p.parser.eofTerm;
          main2.start = main2.end = stack.pos;
          actionIndex = this.addActions(stack, main2.value, main2.end, actionIndex);
        }
        this.mainToken = main2;
        return this.actions;
      }
      getMainToken(stack) {
        if (this.mainToken)
          return this.mainToken;
        let main2 = new CachedToken(), { pos, p } = stack;
        main2.start = pos;
        main2.end = Math.min(pos + 1, p.stream.end);
        main2.value = pos == p.stream.end ? p.parser.eofTerm : 0;
        return main2;
      }
      updateCachedToken(token, tokenizer, stack) {
        let start2 = this.stream.clipPos(stack.pos);
        tokenizer.token(this.stream.reset(start2, token), stack);
        if (token.value > -1) {
          let { parser: parser2 } = stack.p;
          for (let i = 0; i < parser2.specialized.length; i++)
            if (parser2.specialized[i] == token.value) {
              let result = parser2.specializers[i](this.stream.read(token.start, token.end), stack);
              if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
                if ((result & 1) == 0)
                  token.value = result >> 1;
                else
                  token.extended = result >> 1;
                break;
              }
            }
        } else {
          token.value = 0;
          token.end = this.stream.clipPos(start2 + 1);
        }
      }
      putAction(action, token, end, index) {
        for (let i = 0; i < index; i += 3)
          if (this.actions[i] == action)
            return index;
        this.actions[index++] = action;
        this.actions[index++] = token;
        this.actions[index++] = end;
        return index;
      }
      addActions(stack, token, end, index) {
        let { state } = stack, { parser: parser2 } = stack.p, { data } = parser2;
        for (let set = 0; set < 2; set++) {
          for (let i = parser2.stateSlot(
            state,
            set ? 2 : 1
            /* ParseState.Actions */
          ); ; i += 3) {
            if (data[i] == 65535) {
              if (data[i + 1] == 1) {
                i = pair(data, i + 2);
              } else {
                if (index == 0 && data[i + 1] == 2)
                  index = this.putAction(pair(data, i + 2), token, end, index);
                break;
              }
            }
            if (data[i] == token)
              index = this.putAction(pair(data, i + 1), token, end, index);
          }
        }
        return index;
      }
    };
    Parse = class {
      constructor(parser2, input, fragments, ranges) {
        this.parser = parser2;
        this.input = input;
        this.ranges = ranges;
        this.recovering = 0;
        this.nextStackID = 9812;
        this.minStackPos = 0;
        this.reused = [];
        this.stoppedAt = null;
        this.lastBigReductionStart = -1;
        this.lastBigReductionSize = 0;
        this.bigReductionCount = 0;
        this.stream = new InputStream(input, ranges);
        this.tokens = new TokenCache(parser2, this.stream);
        this.topTerm = parser2.top[1];
        let { from } = ranges[0];
        this.stacks = [Stack.start(this, parser2.top[0], from)];
        this.fragments = fragments.length && this.stream.end - from > parser2.bufferLength * 4 ? new FragmentCursor(fragments, parser2.nodeSet) : null;
      }
      get parsedPos() {
        return this.minStackPos;
      }
      // Move the parser forward. This will process all parse stacks at
      // `this.pos` and try to advance them to a further position. If no
      // stack for such a position is found, it'll start error-recovery.
      //
      // When the parse is finished, this will return a syntax tree. When
      // not, it returns `null`.
      advance() {
        let stacks = this.stacks, pos = this.minStackPos;
        let newStacks = this.stacks = [];
        let stopped, stoppedTokens;
        if (this.bigReductionCount > 300 && stacks.length == 1) {
          let [s] = stacks;
          while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {
          }
          this.bigReductionCount = this.lastBigReductionSize = 0;
        }
        for (let i = 0; i < stacks.length; i++) {
          let stack = stacks[i];
          for (; ; ) {
            this.tokens.mainToken = null;
            if (stack.pos > pos) {
              newStacks.push(stack);
            } else if (this.advanceStack(stack, newStacks, stacks)) {
              continue;
            } else {
              if (!stopped) {
                stopped = [];
                stoppedTokens = [];
              }
              stopped.push(stack);
              let tok = this.tokens.getMainToken(stack);
              stoppedTokens.push(tok.value, tok.end);
            }
            break;
          }
        }
        if (!newStacks.length) {
          let finished = stopped && findFinished(stopped);
          if (finished) {
            if (verbose)
              console.log("Finish with " + this.stackID(finished));
            return this.stackToTree(finished);
          }
          if (this.parser.strict) {
            if (verbose && stopped)
              console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
            throw new SyntaxError("No parse at " + pos);
          }
          if (!this.recovering)
            this.recovering = 5;
        }
        if (this.recovering && stopped) {
          let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
          if (finished) {
            if (verbose)
              console.log("Force-finish " + this.stackID(finished));
            return this.stackToTree(finished.forceAll());
          }
        }
        if (this.recovering) {
          let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
          if (newStacks.length > maxRemaining) {
            newStacks.sort((a2, b) => b.score - a2.score);
            while (newStacks.length > maxRemaining)
              newStacks.pop();
          }
          if (newStacks.some((s) => s.reducePos > pos))
            this.recovering--;
        } else if (newStacks.length > 1) {
          outer: for (let i = 0; i < newStacks.length - 1; i++) {
            let stack = newStacks[i];
            for (let j = i + 1; j < newStacks.length; j++) {
              let other = newStacks[j];
              if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
                if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
                  newStacks.splice(j--, 1);
                } else {
                  newStacks.splice(i--, 1);
                  continue outer;
                }
              }
            }
          }
          if (newStacks.length > 12) {
            newStacks.sort((a2, b) => b.score - a2.score);
            newStacks.splice(
              12,
              newStacks.length - 12
              /* Rec.MaxStackCount */
            );
          }
        }
        this.minStackPos = newStacks[0].pos;
        for (let i = 1; i < newStacks.length; i++)
          if (newStacks[i].pos < this.minStackPos)
            this.minStackPos = newStacks[i].pos;
        return null;
      }
      stopAt(pos) {
        if (this.stoppedAt != null && this.stoppedAt < pos)
          throw new RangeError("Can't move stoppedAt forward");
        this.stoppedAt = pos;
      }
      // Returns an updated version of the given stack, or null if the
      // stack can't advance normally. When `split` and `stacks` are
      // given, stacks split off by ambiguous operations will be pushed to
      // `split`, or added to `stacks` if they move `pos` forward.
      advanceStack(stack, stacks, split) {
        let start2 = stack.pos, { parser: parser2 } = this;
        let base = verbose ? this.stackID(stack) + " -> " : "";
        if (this.stoppedAt != null && start2 > this.stoppedAt)
          return stack.forceReduce() ? stack : null;
        if (this.fragments) {
          let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
          for (let cached = this.fragments.nodeAt(start2); cached; ) {
            let match = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser2.getGoto(stack.state, cached.type.id) : -1;
            if (match > -1 && cached.length && (!strictCx || (cached.prop(NodeProp.contextHash) || 0) == cxHash)) {
              stack.useNode(cached, match);
              if (verbose)
                console.log(base + this.stackID(stack) + ` (via reuse of ${parser2.getName(cached.type.id)})`);
              return true;
            }
            if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
              break;
            let inner = cached.children[0];
            if (inner instanceof Tree && cached.positions[0] == 0)
              cached = inner;
            else
              break;
          }
        }
        let defaultReduce = parser2.stateSlot(
          stack.state,
          4
          /* ParseState.DefaultReduce */
        );
        if (defaultReduce > 0) {
          stack.reduce(defaultReduce);
          if (verbose)
            console.log(base + this.stackID(stack) + ` (via always-reduce ${parser2.getName(
              defaultReduce & 65535
              /* Action.ValueMask */
            )})`);
          return true;
        }
        if (stack.stack.length >= 8400) {
          while (stack.stack.length > 6e3 && stack.forceReduce()) {
          }
        }
        let actions = this.tokens.getActions(stack);
        for (let i = 0; i < actions.length; ) {
          let action = actions[i++], term = actions[i++], end = actions[i++];
          let last = i == actions.length || !split;
          let localStack = last ? stack : stack.split();
          let main2 = this.tokens.mainToken;
          localStack.apply(action, term, main2 ? main2.start : localStack.pos, end);
          if (verbose)
            console.log(base + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser2.getName(
              action & 65535
              /* Action.ValueMask */
            )}`} for ${parser2.getName(term)} @ ${start2}${localStack == stack ? "" : ", split"})`);
          if (last)
            return true;
          else if (localStack.pos > start2)
            stacks.push(localStack);
          else
            split.push(localStack);
        }
        return false;
      }
      // Advance a given stack forward as far as it will go. Returns the
      // (possibly updated) stack if it got stuck, or null if it moved
      // forward and was given to `pushStackDedup`.
      advanceFully(stack, newStacks) {
        let pos = stack.pos;
        for (; ; ) {
          if (!this.advanceStack(stack, null, null))
            return false;
          if (stack.pos > pos) {
            pushStackDedup(stack, newStacks);
            return true;
          }
        }
      }
      runRecovery(stacks, tokens, newStacks) {
        let finished = null, restarted = false;
        for (let i = 0; i < stacks.length; i++) {
          let stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
          let base = verbose ? this.stackID(stack) + " -> " : "";
          if (stack.deadEnd) {
            if (restarted)
              continue;
            restarted = true;
            stack.restart();
            if (verbose)
              console.log(base + this.stackID(stack) + " (restarted)");
            let done = this.advanceFully(stack, newStacks);
            if (done)
              continue;
          }
          let force = stack.split(), forceBase = base;
          for (let j = 0; j < 10 && force.forceReduce(); j++) {
            if (verbose)
              console.log(forceBase + this.stackID(force) + " (via force-reduce)");
            let done = this.advanceFully(force, newStacks);
            if (done)
              break;
            if (verbose)
              forceBase = this.stackID(force) + " -> ";
          }
          for (let insert of stack.recoverByInsert(token)) {
            if (verbose)
              console.log(base + this.stackID(insert) + " (via recover-insert)");
            this.advanceFully(insert, newStacks);
          }
          if (this.stream.end > stack.pos) {
            if (tokenEnd == stack.pos) {
              tokenEnd++;
              token = 0;
            }
            stack.recoverByDelete(token, tokenEnd);
            if (verbose)
              console.log(base + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
            pushStackDedup(stack, newStacks);
          } else if (!finished || finished.score < force.score) {
            finished = force;
          }
        }
        return finished;
      }
      // Convert the stack's buffer to a syntax tree.
      stackToTree(stack) {
        stack.close();
        return Tree.build({
          buffer: StackBufferCursor.create(stack),
          nodeSet: this.parser.nodeSet,
          topID: this.topTerm,
          maxBufferLength: this.parser.bufferLength,
          reused: this.reused,
          start: this.ranges[0].from,
          length: stack.pos - this.ranges[0].from,
          minRepeatType: this.parser.minRepeatTerm
        });
      }
      stackID(stack) {
        let id = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
        if (!id)
          stackIDs.set(stack, id = String.fromCodePoint(this.nextStackID++));
        return id + stack;
      }
    };
    Dialect = class {
      constructor(source, flags, disabled) {
        this.source = source;
        this.flags = flags;
        this.disabled = disabled;
      }
      allows(term) {
        return !this.disabled || this.disabled[term] == 0;
      }
    };
    LRParser = class _LRParser extends Parser {
      /**
      @internal
      */
      constructor(spec) {
        super();
        this.wrappers = [];
        if (spec.version != 14)
          throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
        let nodeNames = spec.nodeNames.split(" ");
        this.minRepeatTerm = nodeNames.length;
        for (let i = 0; i < spec.repeatNodeCount; i++)
          nodeNames.push("");
        let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
        let nodeProps = [];
        for (let i = 0; i < nodeNames.length; i++)
          nodeProps.push([]);
        function setProp(nodeID, prop, value) {
          nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
        }
        if (spec.nodeProps)
          for (let propSpec of spec.nodeProps) {
            let prop = propSpec[0];
            if (typeof prop == "string")
              prop = NodeProp[prop];
            for (let i = 1; i < propSpec.length; ) {
              let next = propSpec[i++];
              if (next >= 0) {
                setProp(next, prop, propSpec[i++]);
              } else {
                let value = propSpec[i + -next];
                for (let j = -next; j > 0; j--)
                  setProp(propSpec[i++], prop, value);
                i++;
              }
            }
          }
        this.nodeSet = new NodeSet(nodeNames.map((name2, i) => NodeType.define({
          name: i >= this.minRepeatTerm ? void 0 : name2,
          id: i,
          props: nodeProps[i],
          top: topTerms.indexOf(i) > -1,
          error: i == 0,
          skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
        })));
        if (spec.propSources)
          this.nodeSet = this.nodeSet.extend(...spec.propSources);
        this.strict = false;
        this.bufferLength = DefaultBufferLength;
        let tokenArray = decodeArray(spec.tokenData);
        this.context = spec.context;
        this.specializerSpecs = spec.specialized || [];
        this.specialized = new Uint16Array(this.specializerSpecs.length);
        for (let i = 0; i < this.specializerSpecs.length; i++)
          this.specialized[i] = this.specializerSpecs[i].term;
        this.specializers = this.specializerSpecs.map(getSpecializer);
        this.states = decodeArray(spec.states, Uint32Array);
        this.data = decodeArray(spec.stateData);
        this.goto = decodeArray(spec.goto);
        this.maxTerm = spec.maxTerm;
        this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
        this.topRules = spec.topRules;
        this.dialects = spec.dialects || {};
        this.dynamicPrecedences = spec.dynamicPrecedences || null;
        this.tokenPrecTable = spec.tokenPrec;
        this.termNames = spec.termNames || null;
        this.maxNode = this.nodeSet.types.length - 1;
        this.dialect = this.parseDialect();
        this.top = this.topRules[Object.keys(this.topRules)[0]];
      }
      createParse(input, fragments, ranges) {
        let parse = new Parse(this, input, fragments, ranges);
        for (let w of this.wrappers)
          parse = w(parse, input, fragments, ranges);
        return parse;
      }
      /**
      Get a goto table entry @internal
      */
      getGoto(state, term, loose = false) {
        let table = this.goto;
        if (term >= table[0])
          return -1;
        for (let pos = table[term + 1]; ; ) {
          let groupTag = table[pos++], last = groupTag & 1;
          let target = table[pos++];
          if (last && loose)
            return target;
          for (let end = pos + (groupTag >> 1); pos < end; pos++)
            if (table[pos] == state)
              return target;
          if (last)
            return -1;
        }
      }
      /**
      Check if this state has an action for a given terminal @internal
      */
      hasAction(state, terminal) {
        let data = this.data;
        for (let set = 0; set < 2; set++) {
          for (let i = this.stateSlot(
            state,
            set ? 2 : 1
            /* ParseState.Actions */
          ), next; ; i += 3) {
            if ((next = data[i]) == 65535) {
              if (data[i + 1] == 1)
                next = data[i = pair(data, i + 2)];
              else if (data[i + 1] == 2)
                return pair(data, i + 2);
              else
                break;
            }
            if (next == terminal || next == 0)
              return pair(data, i + 1);
          }
        }
        return 0;
      }
      /**
      @internal
      */
      stateSlot(state, slot) {
        return this.states[state * 6 + slot];
      }
      /**
      @internal
      */
      stateFlag(state, flag) {
        return (this.stateSlot(
          state,
          0
          /* ParseState.Flags */
        ) & flag) > 0;
      }
      /**
      @internal
      */
      validAction(state, action) {
        return !!this.allActions(state, (a2) => a2 == action ? true : null);
      }
      /**
      @internal
      */
      allActions(state, action) {
        let deflt = this.stateSlot(
          state,
          4
          /* ParseState.DefaultReduce */
        );
        let result = deflt ? action(deflt) : void 0;
        for (let i = this.stateSlot(
          state,
          1
          /* ParseState.Actions */
        ); result == null; i += 3) {
          if (this.data[i] == 65535) {
            if (this.data[i + 1] == 1)
              i = pair(this.data, i + 2);
            else
              break;
          }
          result = action(pair(this.data, i + 1));
        }
        return result;
      }
      /**
      Get the states that can follow this one through shift actions or
      goto jumps. @internal
      */
      nextStates(state) {
        let result = [];
        for (let i = this.stateSlot(
          state,
          1
          /* ParseState.Actions */
        ); ; i += 3) {
          if (this.data[i] == 65535) {
            if (this.data[i + 1] == 1)
              i = pair(this.data, i + 2);
            else
              break;
          }
          if ((this.data[i + 2] & 65536 >> 16) == 0) {
            let value = this.data[i + 1];
            if (!result.some((v, i2) => i2 & 1 && v == value))
              result.push(this.data[i], value);
          }
        }
        return result;
      }
      /**
      Configure the parser. Returns a new parser instance that has the
      given settings modified. Settings not provided in `config` are
      kept from the original parser.
      */
      configure(config) {
        let copy = Object.assign(Object.create(_LRParser.prototype), this);
        if (config.props)
          copy.nodeSet = this.nodeSet.extend(...config.props);
        if (config.top) {
          let info = this.topRules[config.top];
          if (!info)
            throw new RangeError(`Invalid top rule name ${config.top}`);
          copy.top = info;
        }
        if (config.tokenizers)
          copy.tokenizers = this.tokenizers.map((t2) => {
            let found = config.tokenizers.find((r) => r.from == t2);
            return found ? found.to : t2;
          });
        if (config.specializers) {
          copy.specializers = this.specializers.slice();
          copy.specializerSpecs = this.specializerSpecs.map((s, i) => {
            let found = config.specializers.find((r) => r.from == s.external);
            if (!found)
              return s;
            let spec = Object.assign(Object.assign({}, s), { external: found.to });
            copy.specializers[i] = getSpecializer(spec);
            return spec;
          });
        }
        if (config.contextTracker)
          copy.context = config.contextTracker;
        if (config.dialect)
          copy.dialect = this.parseDialect(config.dialect);
        if (config.strict != null)
          copy.strict = config.strict;
        if (config.wrap)
          copy.wrappers = copy.wrappers.concat(config.wrap);
        if (config.bufferLength != null)
          copy.bufferLength = config.bufferLength;
        return copy;
      }
      /**
      Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
      are registered for this parser.
      */
      hasWrappers() {
        return this.wrappers.length > 0;
      }
      /**
      Returns the name associated with a given term. This will only
      work for all terms when the parser was generated with the
      `--names` option. By default, only the names of tagged terms are
      stored.
      */
      getName(term) {
        return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
      }
      /**
      The eof term id is always allocated directly after the node
      types. @internal
      */
      get eofTerm() {
        return this.maxNode + 1;
      }
      /**
      The type of top node produced by the parser.
      */
      get topNode() {
        return this.nodeSet.types[this.top[1]];
      }
      /**
      @internal
      */
      dynamicPrecedence(term) {
        let prec = this.dynamicPrecedences;
        return prec == null ? 0 : prec[term] || 0;
      }
      /**
      @internal
      */
      parseDialect(dialect) {
        let values = Object.keys(this.dialects), flags = values.map(() => false);
        if (dialect)
          for (let part of dialect.split(" ")) {
            let id = values.indexOf(part);
            if (id >= 0)
              flags[id] = true;
          }
        let disabled = null;
        for (let i = 0; i < values.length; i++)
          if (!flags[i]) {
            for (let j = this.dialects[values[i]], id; (id = this.data[j++]) != 65535; )
              (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id] = 1;
          }
        return new Dialect(dialect, flags, disabled);
      }
      /**
      Used by the output of the parser generator. Not available to
      user code. @hide
      */
      static deserialize(spec) {
        return new _LRParser(spec);
      }
    };
  }
});

// node_modules/@lezer/highlight/dist/index.js
function sameArray(a2, b) {
  return a2.length == b.length && a2.every((x, i) => x == b[i]);
}
function powerSet(array) {
  let sets = [[]];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0, e = sets.length; j < e; j++) {
      sets.push(sets[j].concat(array[i]));
    }
  }
  return sets.sort((a2, b) => b.length - a2.length);
}
function styleTags(spec) {
  let byName = /* @__PURE__ */ Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2))
      tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [], mode = 2, rest = part;
        for (let pos = 0; ; ) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode = 1;
            break;
          }
          let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m)
            throw new RangeError("Invalid path: " + part);
          pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
          pos += m[0].length;
          if (pos == part.length)
            break;
          let next = part[pos++];
          if (pos == part.length && next == "!") {
            mode = 0;
            break;
          }
          if (next != "/")
            throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last = pieces.length - 1, inner = pieces[last];
        if (!inner)
          throw new RangeError("Invalid path: " + part);
        let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
function tagHighlighter(tags2, options) {
  let map = /* @__PURE__ */ Object.create(null);
  for (let style of tags2) {
    if (!Array.isArray(style.tag))
      map[style.tag.id] = style.class;
    else
      for (let tag of style.tag)
        map[tag.id] = style.class;
  }
  let { scope, all = null } = options || {};
  return {
    style: (tags3) => {
      let cls = all;
      for (let tag of tags3) {
        for (let sub of tag.set) {
          let tagClass = map[sub.id];
          if (tagClass) {
            cls = cls ? cls + " " + tagClass : tagClass;
            break;
          }
        }
      }
      return cls;
    },
    scope
  };
}
var nextTagID, Tag, nextModifierID, Modifier, ruleNodeProp, Rule, t, comment, name, typeName, propertyName, literal, string, number, content, heading, keyword, operator, punctuation, bracket, meta, tags, classHighlighter;
var init_dist3 = __esm({
  "node_modules/@lezer/highlight/dist/index.js"() {
    init_dist();
    nextTagID = 0;
    Tag = class _Tag {
      /**
      @internal
      */
      constructor(name2, set, base, modified) {
        this.name = name2;
        this.set = set;
        this.base = base;
        this.modified = modified;
        this.id = nextTagID++;
      }
      toString() {
        let { name: name2 } = this;
        for (let mod of this.modified)
          if (mod.name)
            name2 = `${mod.name}(${name2})`;
        return name2;
      }
      static define(nameOrParent, parent) {
        let name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
        if (nameOrParent instanceof _Tag)
          parent = nameOrParent;
        if (parent === null || parent === void 0 ? void 0 : parent.base)
          throw new Error("Can not derive from a modified tag");
        let tag = new _Tag(name2, [], null, []);
        tag.set.push(tag);
        if (parent)
          for (let t2 of parent.set)
            tag.set.push(t2);
        return tag;
      }
      /**
      Define a tag _modifier_, which is a function that, given a tag,
      will return a tag that is a subtag of the original. Applying the
      same modifier to a twice tag will return the same value (`m1(t1)
      == m1(t1)`) and applying multiple modifiers will, regardless or
      order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
      
      When multiple modifiers are applied to a given base tag, each
      smaller set of modifiers is registered as a parent, so that for
      example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
      `m1(m3(t1)`, and so on.
      */
      static defineModifier(name2) {
        let mod = new Modifier(name2);
        return (tag) => {
          if (tag.modified.indexOf(mod) > -1)
            return tag;
          return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a2, b) => a2.id - b.id));
        };
      }
    };
    nextModifierID = 0;
    Modifier = class _Modifier {
      constructor(name2) {
        this.name = name2;
        this.instances = [];
        this.id = nextModifierID++;
      }
      static get(base, mods) {
        if (!mods.length)
          return base;
        let exists = mods[0].instances.find((t2) => t2.base == base && sameArray(mods, t2.modified));
        if (exists)
          return exists;
        let set = [], tag = new Tag(base.name, set, base, mods);
        for (let m of mods)
          m.instances.push(tag);
        let configs = powerSet(mods);
        for (let parent of base.set)
          if (!parent.modified.length)
            for (let config of configs)
              set.push(_Modifier.get(parent, config));
        return tag;
      }
    };
    ruleNodeProp = new NodeProp({
      combine(a2, b) {
        let cur, root, take;
        while (a2 || b) {
          if (!a2 || b && a2.depth >= b.depth) {
            take = b;
            b = b.next;
          } else {
            take = a2;
            a2 = a2.next;
          }
          if (cur && cur.mode == take.mode && !take.context && !cur.context)
            continue;
          let copy = new Rule(take.tags, take.mode, take.context);
          if (cur)
            cur.next = copy;
          else
            root = copy;
          cur = copy;
        }
        return root;
      }
    });
    Rule = class {
      constructor(tags2, mode, context, next) {
        this.tags = tags2;
        this.mode = mode;
        this.context = context;
        this.next = next;
      }
      get opaque() {
        return this.mode == 0;
      }
      get inherit() {
        return this.mode == 1;
      }
      sort(other) {
        if (!other || other.depth < this.depth) {
          this.next = other;
          return this;
        }
        other.next = this.sort(other.next);
        return other;
      }
      get depth() {
        return this.context ? this.context.length : 0;
      }
    };
    Rule.empty = new Rule([], 2, null);
    t = Tag.define;
    comment = t();
    name = t();
    typeName = t(name);
    propertyName = t(name);
    literal = t();
    string = t(literal);
    number = t(literal);
    content = t();
    heading = t(content);
    keyword = t();
    operator = t();
    punctuation = t();
    bracket = t(punctuation);
    meta = t();
    tags = {
      /**
      A comment.
      */
      comment,
      /**
      A line [comment](#highlight.tags.comment).
      */
      lineComment: t(comment),
      /**
      A block [comment](#highlight.tags.comment).
      */
      blockComment: t(comment),
      /**
      A documentation [comment](#highlight.tags.comment).
      */
      docComment: t(comment),
      /**
      Any kind of identifier.
      */
      name,
      /**
      The [name](#highlight.tags.name) of a variable.
      */
      variableName: t(name),
      /**
      A type [name](#highlight.tags.name).
      */
      typeName,
      /**
      A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
      */
      tagName: t(typeName),
      /**
      A property or field [name](#highlight.tags.name).
      */
      propertyName,
      /**
      An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
      */
      attributeName: t(propertyName),
      /**
      The [name](#highlight.tags.name) of a class.
      */
      className: t(name),
      /**
      A label [name](#highlight.tags.name).
      */
      labelName: t(name),
      /**
      A namespace [name](#highlight.tags.name).
      */
      namespace: t(name),
      /**
      The [name](#highlight.tags.name) of a macro.
      */
      macroName: t(name),
      /**
      A literal value.
      */
      literal,
      /**
      A string [literal](#highlight.tags.literal).
      */
      string,
      /**
      A documentation [string](#highlight.tags.string).
      */
      docString: t(string),
      /**
      A character literal (subtag of [string](#highlight.tags.string)).
      */
      character: t(string),
      /**
      An attribute value (subtag of [string](#highlight.tags.string)).
      */
      attributeValue: t(string),
      /**
      A number [literal](#highlight.tags.literal).
      */
      number,
      /**
      An integer [number](#highlight.tags.number) literal.
      */
      integer: t(number),
      /**
      A floating-point [number](#highlight.tags.number) literal.
      */
      float: t(number),
      /**
      A boolean [literal](#highlight.tags.literal).
      */
      bool: t(literal),
      /**
      Regular expression [literal](#highlight.tags.literal).
      */
      regexp: t(literal),
      /**
      An escape [literal](#highlight.tags.literal), for example a
      backslash escape in a string.
      */
      escape: t(literal),
      /**
      A color [literal](#highlight.tags.literal).
      */
      color: t(literal),
      /**
      A URL [literal](#highlight.tags.literal).
      */
      url: t(literal),
      /**
      A language keyword.
      */
      keyword,
      /**
      The [keyword](#highlight.tags.keyword) for the self or this
      object.
      */
      self: t(keyword),
      /**
      The [keyword](#highlight.tags.keyword) for null.
      */
      null: t(keyword),
      /**
      A [keyword](#highlight.tags.keyword) denoting some atomic value.
      */
      atom: t(keyword),
      /**
      A [keyword](#highlight.tags.keyword) that represents a unit.
      */
      unit: t(keyword),
      /**
      A modifier [keyword](#highlight.tags.keyword).
      */
      modifier: t(keyword),
      /**
      A [keyword](#highlight.tags.keyword) that acts as an operator.
      */
      operatorKeyword: t(keyword),
      /**
      A control-flow related [keyword](#highlight.tags.keyword).
      */
      controlKeyword: t(keyword),
      /**
      A [keyword](#highlight.tags.keyword) that defines something.
      */
      definitionKeyword: t(keyword),
      /**
      A [keyword](#highlight.tags.keyword) related to defining or
      interfacing with modules.
      */
      moduleKeyword: t(keyword),
      /**
      An operator.
      */
      operator,
      /**
      An [operator](#highlight.tags.operator) that dereferences something.
      */
      derefOperator: t(operator),
      /**
      Arithmetic-related [operator](#highlight.tags.operator).
      */
      arithmeticOperator: t(operator),
      /**
      Logical [operator](#highlight.tags.operator).
      */
      logicOperator: t(operator),
      /**
      Bit [operator](#highlight.tags.operator).
      */
      bitwiseOperator: t(operator),
      /**
      Comparison [operator](#highlight.tags.operator).
      */
      compareOperator: t(operator),
      /**
      [Operator](#highlight.tags.operator) that updates its operand.
      */
      updateOperator: t(operator),
      /**
      [Operator](#highlight.tags.operator) that defines something.
      */
      definitionOperator: t(operator),
      /**
      Type-related [operator](#highlight.tags.operator).
      */
      typeOperator: t(operator),
      /**
      Control-flow [operator](#highlight.tags.operator).
      */
      controlOperator: t(operator),
      /**
      Program or markup punctuation.
      */
      punctuation,
      /**
      [Punctuation](#highlight.tags.punctuation) that separates
      things.
      */
      separator: t(punctuation),
      /**
      Bracket-style [punctuation](#highlight.tags.punctuation).
      */
      bracket,
      /**
      Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
      tokens).
      */
      angleBracket: t(bracket),
      /**
      Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
      tokens).
      */
      squareBracket: t(bracket),
      /**
      Parentheses (usually `(` and `)` tokens). Subtag of
      [bracket](#highlight.tags.bracket).
      */
      paren: t(bracket),
      /**
      Braces (usually `{` and `}` tokens). Subtag of
      [bracket](#highlight.tags.bracket).
      */
      brace: t(bracket),
      /**
      Content, for example plain text in XML or markup documents.
      */
      content,
      /**
      [Content](#highlight.tags.content) that represents a heading.
      */
      heading,
      /**
      A level 1 [heading](#highlight.tags.heading).
      */
      heading1: t(heading),
      /**
      A level 2 [heading](#highlight.tags.heading).
      */
      heading2: t(heading),
      /**
      A level 3 [heading](#highlight.tags.heading).
      */
      heading3: t(heading),
      /**
      A level 4 [heading](#highlight.tags.heading).
      */
      heading4: t(heading),
      /**
      A level 5 [heading](#highlight.tags.heading).
      */
      heading5: t(heading),
      /**
      A level 6 [heading](#highlight.tags.heading).
      */
      heading6: t(heading),
      /**
      A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
      */
      contentSeparator: t(content),
      /**
      [Content](#highlight.tags.content) that represents a list.
      */
      list: t(content),
      /**
      [Content](#highlight.tags.content) that represents a quote.
      */
      quote: t(content),
      /**
      [Content](#highlight.tags.content) that is emphasized.
      */
      emphasis: t(content),
      /**
      [Content](#highlight.tags.content) that is styled strong.
      */
      strong: t(content),
      /**
      [Content](#highlight.tags.content) that is part of a link.
      */
      link: t(content),
      /**
      [Content](#highlight.tags.content) that is styled as code or
      monospace.
      */
      monospace: t(content),
      /**
      [Content](#highlight.tags.content) that has a strike-through
      style.
      */
      strikethrough: t(content),
      /**
      Inserted text in a change-tracking format.
      */
      inserted: t(),
      /**
      Deleted text.
      */
      deleted: t(),
      /**
      Changed text.
      */
      changed: t(),
      /**
      An invalid or unsyntactic element.
      */
      invalid: t(),
      /**
      Metadata or meta-instruction.
      */
      meta,
      /**
      [Metadata](#highlight.tags.meta) that applies to the entire
      document.
      */
      documentMeta: t(meta),
      /**
      [Metadata](#highlight.tags.meta) that annotates or adds
      attributes to a given syntactic element.
      */
      annotation: t(meta),
      /**
      Processing instruction or preprocessor directive. Subtag of
      [meta](#highlight.tags.meta).
      */
      processingInstruction: t(meta),
      /**
      [Modifier](#highlight.Tag^defineModifier) that indicates that a
      given element is being defined. Expected to be used with the
      various [name](#highlight.tags.name) tags.
      */
      definition: Tag.defineModifier("definition"),
      /**
      [Modifier](#highlight.Tag^defineModifier) that indicates that
      something is constant. Mostly expected to be used with
      [variable names](#highlight.tags.variableName).
      */
      constant: Tag.defineModifier("constant"),
      /**
      [Modifier](#highlight.Tag^defineModifier) used to indicate that
      a [variable](#highlight.tags.variableName) or [property
      name](#highlight.tags.propertyName) is being called or defined
      as a function.
      */
      function: Tag.defineModifier("function"),
      /**
      [Modifier](#highlight.Tag^defineModifier) that can be applied to
      [names](#highlight.tags.name) to indicate that they belong to
      the language's standard environment.
      */
      standard: Tag.defineModifier("standard"),
      /**
      [Modifier](#highlight.Tag^defineModifier) that indicates a given
      [names](#highlight.tags.name) is local to some scope.
      */
      local: Tag.defineModifier("local"),
      /**
      A generic variant [modifier](#highlight.Tag^defineModifier) that
      can be used to tag language-specific alternative variants of
      some common tag. It is recommended for themes to define special
      forms of at least the [string](#highlight.tags.string) and
      [variable name](#highlight.tags.variableName) tags, since those
      come up a lot.
      */
      special: Tag.defineModifier("special")
    };
    for (let name2 in tags) {
      let val = tags[name2];
      if (val instanceof Tag)
        val.name = name2;
    }
    classHighlighter = tagHighlighter([
      { tag: tags.link, class: "tok-link" },
      { tag: tags.heading, class: "tok-heading" },
      { tag: tags.emphasis, class: "tok-emphasis" },
      { tag: tags.strong, class: "tok-strong" },
      { tag: tags.keyword, class: "tok-keyword" },
      { tag: tags.atom, class: "tok-atom" },
      { tag: tags.bool, class: "tok-bool" },
      { tag: tags.url, class: "tok-url" },
      { tag: tags.labelName, class: "tok-labelName" },
      { tag: tags.inserted, class: "tok-inserted" },
      { tag: tags.deleted, class: "tok-deleted" },
      { tag: tags.literal, class: "tok-literal" },
      { tag: tags.string, class: "tok-string" },
      { tag: tags.number, class: "tok-number" },
      { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
      { tag: tags.variableName, class: "tok-variableName" },
      { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
      { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
      { tag: tags.special(tags.variableName), class: "tok-variableName2" },
      { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
      { tag: tags.typeName, class: "tok-typeName" },
      { tag: tags.namespace, class: "tok-namespace" },
      { tag: tags.className, class: "tok-className" },
      { tag: tags.macroName, class: "tok-macroName" },
      { tag: tags.propertyName, class: "tok-propertyName" },
      { tag: tags.operator, class: "tok-operator" },
      { tag: tags.comment, class: "tok-comment" },
      { tag: tags.meta, class: "tok-meta" },
      { tag: tags.invalid, class: "tok-invalid" },
      { tag: tags.punctuation, class: "tok-punctuation" }
    ]);
  }
});

// node_modules/@lezer/cpp/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  parser: () => parser
});
var RawString, templateArgsEndFallback, MacroName, R, L, u, U, a, z, A, Z, Underscore, Zero, Quote, ParenL, ParenR, Space, GreaterThan, rawString, fallback, cppHighlighting, spec_identifier, spec_, spec_templateArgsEnd, spec_scopedIdentifier, parser;
var init_dist4 = __esm({
  "node_modules/@lezer/cpp/dist/index.js"() {
    init_dist2();
    init_dist3();
    RawString = 1;
    templateArgsEndFallback = 2;
    MacroName = 3;
    R = 82;
    L = 76;
    u = 117;
    U = 85;
    a = 97;
    z = 122;
    A = 65;
    Z = 90;
    Underscore = 95;
    Zero = 48;
    Quote = 34;
    ParenL = 40;
    ParenR = 41;
    Space = 32;
    GreaterThan = 62;
    rawString = new ExternalTokenizer((input) => {
      if (input.next == L || input.next == U) {
        input.advance();
      } else if (input.next == u) {
        input.advance();
        if (input.next == Zero + 8) input.advance();
      }
      if (input.next != R) return;
      input.advance();
      if (input.next != Quote) return;
      input.advance();
      let marker = "";
      while (input.next != ParenL) {
        if (input.next == Space || input.next <= 13 || input.next == ParenR) return;
        marker += String.fromCharCode(input.next);
        input.advance();
      }
      input.advance();
      for (; ; ) {
        if (input.next < 0)
          return input.acceptToken(RawString);
        if (input.next == ParenR) {
          let match = true;
          for (let i = 0; match && i < marker.length; i++)
            if (input.peek(i + 1) != marker.charCodeAt(i)) match = false;
          if (match && input.peek(marker.length + 1) == Quote)
            return input.acceptToken(RawString, 2 + marker.length);
        }
        input.advance();
      }
    });
    fallback = new ExternalTokenizer((input) => {
      if (input.next == GreaterThan) {
        if (input.peek(1) == GreaterThan)
          input.acceptToken(templateArgsEndFallback, 1);
      } else {
        let sawLetter = false, i = 0;
        for (; ; i++) {
          if (input.next >= A && input.next <= Z) sawLetter = true;
          else if (input.next >= a && input.next <= z) return;
          else if (input.next != Underscore && !(input.next >= Zero && input.next <= Zero + 9)) break;
          input.advance();
        }
        if (sawLetter && i > 1) input.acceptToken(MacroName);
      }
    }, { extend: true });
    cppHighlighting = styleTags({
      "typedef struct union enum class typename decltype auto template operator friend noexcept namespace using requires concept import export module __attribute__ __declspec __based": tags.definitionKeyword,
      "extern MsCallModifier MsPointerModifier extern static register thread_local inline const volatile restrict _Atomic mutable constexpr constinit consteval virtual explicit VirtualSpecifier Access": tags.modifier,
      "if else switch for while do case default return break continue goto throw try catch": tags.controlKeyword,
      "co_return co_yield co_await": tags.controlKeyword,
      "new sizeof delete static_assert": tags.operatorKeyword,
      "NULL nullptr": tags.null,
      this: tags.self,
      "True False": tags.bool,
      "TypeSize PrimitiveType": tags.standard(tags.typeName),
      TypeIdentifier: tags.typeName,
      FieldIdentifier: tags.propertyName,
      "CallExpression/FieldExpression/FieldIdentifier": tags.function(tags.propertyName),
      "ModuleName/Identifier": tags.namespace,
      "PartitionName": tags.labelName,
      StatementIdentifier: tags.labelName,
      "Identifier DestructorName": tags.variableName,
      "CallExpression/Identifier": tags.function(tags.variableName),
      "CallExpression/ScopedIdentifier/Identifier": tags.function(tags.variableName),
      "FunctionDeclarator/Identifier FunctionDeclarator/DestructorName": tags.function(tags.definition(tags.variableName)),
      NamespaceIdentifier: tags.namespace,
      OperatorName: tags.operator,
      ArithOp: tags.arithmeticOperator,
      LogicOp: tags.logicOperator,
      BitOp: tags.bitwiseOperator,
      CompareOp: tags.compareOperator,
      AssignOp: tags.definitionOperator,
      UpdateOp: tags.updateOperator,
      LineComment: tags.lineComment,
      BlockComment: tags.blockComment,
      Number: tags.number,
      String: tags.string,
      "RawString SystemLibString": tags.special(tags.string),
      CharLiteral: tags.character,
      EscapeSequence: tags.escape,
      "UserDefinedLiteral/Identifier": tags.literal,
      PreProcArg: tags.meta,
      "PreprocDirectiveName #include #ifdef #ifndef #if #define #else #endif #elif": tags.processingInstruction,
      MacroName: tags.special(tags.name),
      "( )": tags.paren,
      "[ ]": tags.squareBracket,
      "{ }": tags.brace,
      "< >": tags.angleBracket,
      ". ->": tags.derefOperator,
      ", ;": tags.separator
    });
    spec_identifier = { __proto__: null, bool: 36, char: 36, int: 36, float: 36, double: 36, void: 36, size_t: 36, ssize_t: 36, intptr_t: 36, uintptr_t: 36, charptr_t: 36, int8_t: 36, int16_t: 36, int32_t: 36, int64_t: 36, uint8_t: 36, uint16_t: 36, uint32_t: 36, uint64_t: 36, char8_t: 36, char16_t: 36, char32_t: 36, char64_t: 36, const: 70, volatile: 72, restrict: 74, _Atomic: 76, mutable: 78, constexpr: 80, constinit: 82, consteval: 84, struct: 88, __declspec: 92, final: 148, override: 148, public: 152, private: 152, protected: 152, virtual: 154, extern: 160, static: 162, register: 164, inline: 166, thread_local: 168, __attribute__: 172, __based: 178, __restrict: 180, __uptr: 180, __sptr: 180, _unaligned: 180, __unaligned: 180, noexcept: 194, requires: 198, TRUE: 796, true: 796, FALSE: 798, false: 798, typename: 218, class: 220, template: 234, throw: 248, __cdecl: 256, __clrcall: 256, __stdcall: 256, __fastcall: 256, __thiscall: 256, __vectorcall: 256, try: 260, catch: 264, export: 282, import: 286, case: 296, default: 298, if: 308, else: 314, switch: 318, do: 322, while: 324, for: 330, return: 334, break: 338, continue: 342, goto: 346, co_return: 350, co_yield: 354, using: 362, typedef: 366, namespace: 380, new: 398, delete: 400, co_await: 402, concept: 406, enum: 410, static_assert: 414, friend: 422, union: 424, explicit: 430, operator: 444, module: 456, signed: 518, unsigned: 518, long: 518, short: 518, decltype: 528, auto: 530, sizeof: 566, NULL: 572, nullptr: 586, this: 588 };
    spec_ = { __proto__: null, "<": 765 };
    spec_templateArgsEnd = { __proto__: null, ">": 135 };
    spec_scopedIdentifier = { __proto__: null, operator: 388, new: 576, delete: 582 };
    parser = LRParser.deserialize({
      version: 14,
      states: "$;xQ!QQVOOP'gOUOOO([OWO'#CdO,UQUO'#CgO,`QUO'#FjO-vQbO'#CxO.XQUO'#CxO0WQUO'#K`O0_QUO'#CwO0jOpO'#DvO0rQ!dO'#D]OOQR'#JP'#JPO5[QVO'#GUO5iQUO'#JWOOQQ'#JW'#JWO8}QUO'#KsO<hQUO'#KsO?OQVO'#E^O?`QUO'#E^OOQQ'#Ed'#EdOOQQ'#Ee'#EeO?eQVO'#EfO@[QVO'#EiOBXQUO'#FPOByQUO'#FhOOQR'#Fj'#FjOCOQUO'#FjOOQR'#LW'#LWOOQR'#LV'#LVOEWQVO'#KVOF{QUO'#L]OGYQUO'#KwOGnQUO'#L]OH`QUO'#L_OOQR'#HU'#HUOOQR'#HV'#HVOOQR'#HW'#HWOOQR'#LS'#LSOOQR'#J`'#J`Q!QQVOOOHnQVO'#FOOIZQUO'#EhOIbQUOOOK^QVO'#HgOKnQUO'#HgONYQUO'#KwONdQUO'#KwOOQQ'#Kw'#KwO!!bQUO'#KwOOQQ'#Jr'#JrO!!oQUO'#HxOOQQ'#K`'#K`O!&aQUO'#K`O!&}QUO'#KVO!(}QVO'#I]O!(}QVO'#I`OCTQUO'#KVOOQQ'#Ip'#IpOOQQ'#KV'#KVO!-QQUO'#K`OOQR'#K_'#K_O!-XQUO'#DZO!/pQUO'#KtOOQQ'#Kt'#KtO!/wQUO'#KtO!0OQUO'#ETO!0TQUO'#EWO!0YQUO'#FRO8}QUO'#FPO!QQVO'#F^O!0_Q#vO'#F`O!0jQUO'#FkO!0rQUO'#FpO!0wQVO'#FrO!0rQUO'#FuO!3vQUO'#FvO!3{QVO'#FxO!4VQUO'#FzO!4[QUO'#F|O!4aQUO'#GOO!4fQVO'#GQO!(}QVO'#GSO!4mQUO'#GpO!4{QUO'#GYO!(}QVO'#FeO!6YQUO'#FeO!6_QVO'#G`O!6fQUO'#GaO!6qQUO'#GnO!6vQUO'#GrO!6{QUO'#GzO!7mQ&lO'#HiO!:pQUO'#GuO!;QQUO'#HXO!;]QUO'#HZO!;eQUO'#DXO!;eQUO'#HuO!;eQUO'#HvO!;|QUO'#HwO!<_QUO'#H|O!=SQUO'#H}O!>xQVO'#IbO!(}QVO'#IdO!?SQUO'#IgO!?ZQVO'#IjP!AQO!LQO'#CaP!A]{,UO'#CbP!6q{,UO'#CbP!Ah{7[O'#CbP!6q{,UO'#CbP!Am{,UO'#CbP!AxOSO'#IzPOOO)CEo)CEoOOOO'#I}'#I}O!BSOWO,59OOOQR,59O,59OO!(}QVO,59VOOQQ,59X,59XOOQR'#Do'#DoO!(}QVO,5;ROOQR,5<U,5<UO!B_QUO,59ZO!(}QVO,5>qOOQR'#IX'#IXOOQR'#IY'#IYOOQR'#IZ'#IZOOQR'#I['#I[O!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!D^QVO,5>zOOQQ,5?W,5?WO!FPQVO'#CjO!IxQUO'#CzOOQQ,59d,59dOOQQ,59c,59cOOQQ,5<},5<}O!JVQ&lO,5=mO!?SQUO,5?RO!LyQVO,5?UO!MQQbO,59dO!M]QVO'#FYOOQQ,5?P,5?PO!MmQVO,59WO!MtO`O,5:bO!MyQbO'#D^O!N[QbO'#KdO!NjQbO,59wO!NrQbO'#CxO# TQUO'#CxO# YQUO'#K`O# dQUO'#CwOOQR-E<}-E<}O# oQUO,5AuO# vQVO'#EfO@[QVO'#EiOBXQUO,5;kOOQR,5<p,5<pO#$oQUO'#KVO#$vQUO'#KVO!(}QVO'#IUO8}QUO,5;kO#%ZQ&lO'#HiO#(bQUO'#CtO#+VQbO'#CxO#+[QUO'#CwO#.xQUO'#K`OOQQ-E=U-E=UO#1]QUO,5A_O#1gQUO'#K`O#1qQUO,5A_OOQR,5Au,5AuOOQQ,5>l,5>lO#3uQUO'#CgO#4kQUO,5>pO#6^QUO'#IeOOQR'#JO'#JOO#6fQUO,5:xO#7SQUO,5:xO#7sQUO,5:xO#8hQUO'#CuO!0TQUO'#CmOOQQ'#JX'#JXO#7SQUO,5:xO#8pQUO,5;QO!4{QUO'#DOO#9yQUO,5;QO#:OQUO,5>QO#;[QUO'#DOO#;rQUO,5>{O#;wQUO'#K}O#=QQUO,5;TO#=YQVO,5;TO#=dQUO,5;TOOQQ,5;T,5;TO#?]QUO'#LbO#?dQUO,5>UO#?iQbO'#CxO#?tQUO'#GcO#?yQUO'#E^O#@jQUO,5;kO#ARQUO'#LTO#AZQUO,5;rOKnQUO'#HfOBXQUO'#HgO#A`QUO'#KwO!6qQUO'#HjO#BWQUO'#CuO!0wQVO,5<SOOQQ'#Cg'#CgOOQR'#Ji'#JiO#B]QVO,5=`OOQQ,5?Z,5?ZO#DfQbO'#CxO#DqQUO'#GcOOQQ'#Jj'#JjOOQQ-E=h-E=hOGYQUO,5AwOGnQUO,5AwO#DvQUO,5AyO#ERQUO'#G|OOQR,5Aw,5AwO#DvQUO,5AwO#E^QUO'#HOO#EfQUO,5AyOOQR,5Ay,5AyOOQR,5Az,5AzO#EtQVO,5AzOOQR-E=^-E=^O#GnQVO,5;jOOQR,5;j,5;jO#IoQUO'#EjO#JtQUO'#EwO#KkQVO'#ExO#M}QUO'#EvO#NVQUO'#EyO$ UQUO'#EzOOQQ'#LQ'#LQO$ {QUO,5;SO$#RQUO'#EvOOQQ,5;S,5;SO$$OQUO,5;SO$%qQUO,5:yO$([QVO,5>PO$(fQUO'#E[O$(sQUO,5>ROOQQ,5>S,5>SO$,aQVO'#C|OOQQ-E=p-E=pOOQQ,5>d,5>dOOQQ,59a,59aO$,kQUO,5>wO$.kQUO,5>zO!6qQUO,59uO$/OQUO,5;qO$/]QUO,5<{O!0TQUO,5:oOOQQ,5:r,5:rO$/hQUO,5;mO$/mQUO'#KsOBXQUO,5;kOOQR,5;x,5;xO$0^QUO'#FbO$0lQUO'#FbO$0qQUO,5;zO$4[QVO'#FmO!0wQVO,5<VO!0rQUO,5<VO!0YQUO,5<[O$4cQVO'#GUO$7_QUO,5<^O!0wQVO,5<aO$:uQVO,5<bO$;SQUO,5<dOOQR,5<d,5<dO$<]QUO,5<dOOQR,5<f,5<fOOQR,5<h,5<hOOQQ'#Fi'#FiO$<bQUO,5<jO$<gQUO,5<lOOQR,5<l,5<lO$=mQUO,5<nO$>sQUO,5<rO$?OQUO,5=[O$?TQUO,5=[O!4{QUO,5<tO$?]QUO,5<tO$?qQUO,5<PO$@wQVO,5<PO$CYQUO,5<zOOQR,5<z,5<zOOQR,5<{,5<{O$?TQUO,5<{O$D`QUO,5<{O$DkQUO,5=YO!(}QVO,5=^O!(}QVO,5=fO#NsQUO,5=mOOQQ,5>T,5>TO$FpQUO,5>TO$FzQUO,5>TO$GPQUO,5>TO$GUQUO,5>TO!6qQUO,5>TO$ISQUO'#K`O$IZQUO,5=oO$IfQUO,5=aOKnQUO,5=oO$J`QUO,5=sOOQR,5=s,5=sO$JhQUO,5=sO$LsQVO'#H[OOQQ,5=u,5=uO!;`QUO,5=uO%#nQUO'#KpO%#uQUO'#KaO%$ZQUO'#KpO%$eQUO'#DyO%$vQUO'#D|O%'sQUO'#KaOOQQ'#Ka'#KaO%)fQUO'#KaO%#uQUO'#KaO%)kQUO'#KaOOQQ,59s,59sOOQQ,5>a,5>aOOQQ,5>b,5>bO%)sQUO'#HzO%){QUO,5>cOOQQ,5>c,5>cO%-gQUO,5>cO%-rQUO,5>hO%1^QVO,5>iO%1eQUO,5>|O# vQVO'#EfO%4kQUO,5>|OOQQ,5>|,5>|O%5[QUO,5?OO%7`QUO,5?RO!<_QUO,5?RO%9[QUO,5?UO%<wQVO,5?UPOOO'#I|'#I|P%=OO!LQO,58{POOO,58{,58{P!Am{,UO,58|P%=Z{,UO,58|P%=i{7[O,58|P%=o{,UO,58|PO{O'#Jv'#JvP%=t{,UO'#LiPOOO'#Li'#LiP%=z{,UO'#LiPOOO,58|,58|POOO,5?f,5?fP%>POSO,5?fOOOO-E<{-E<{OOQR1G.j1G.jO%>WQUO1G.qO%?^QUO1G0mOOQQ1G0m1G0mO%@jQUO'#CpO%ByQbO'#CxO%CUQUO'#CsO%CZQUO'#CsO%C`QUO1G.uO#BWQUO'#CrOOQQ1G.u1G.uO%EcQUO1G4]O%FiQUO1G4^O%H[QUO1G4^O%I}QUO1G4^O%KpQUO1G4^O%McQUO1G4^O& UQUO1G4^O&!wQUO1G4^O&$jQUO1G4^O&&]QUO1G4^O&(OQUO1G4^O&)qQUO1G4^O&+dQUO'#KUO&,mQUO'#KUO&,uQUO,59UOOQQ,5=P,5=PO&.}QUO,5=PO&/XQUO,5=PO&/^QUO,5=PO&/cQUO,5=PO!6qQUO,5=PO#NsQUO1G3XO&/mQUO1G4mO!<_QUO1G4mO&1iQUO1G4pO&3[QVO1G4pOOQQ1G/O1G/OOOQQ1G.}1G.}OOQQ1G2i1G2iO!JVQ&lO1G3XO&3cQUO'#LUO@[QVO'#EiO&4lQUO'#F]OOQQ'#Jb'#JbO&4qQUO'#FZO&4|QUO'#LUO&5UQUO,5;tO&5ZQUO1G.rOOQQ1G.r1G.rOOQR1G/|1G/|O&6|Q!dO'#JQO&7RQbO,59xO&9dQ!eO'#D`O&9kQ!dO'#JSO&9pQbO,5AOO&9pQbO,5AOOOQR1G/c1G/cO&9{QbO1G/cO&:QQ&lO'#GeO&;OQbO,59dOOQR1G7a1G7aO#@jQUO1G1VO&;ZQUO1G1^OBXQUO1G1VO&=lQUO'#CzO#+VQbO,59dO&A_QUO1G6yOOQR-E<|-E<|O&BqQUO1G0dO#6fQUO1G0dOOQQ-E=V-E=VO#7SQUO1G0dOOQQ1G0l1G0lO&CfQUO,59jOOQQ1G3l1G3lO&C|QUO,59jO&DdQUO,59jO!MmQVO1G4gO!(}QVO'#JZO&EOQUO,5AiOOQQ1G0o1G0oO!(}QVO1G0oO!6qQUO'#JoO&EWQUO,5A|OOQQ1G3p1G3pOOQR1G1V1G1VO&ITQVO'#FOO!MmQVO,5;sOOQQ,5;s,5;sOBXQUO'#JdO&KPQUO,5AoO&KXQVO'#E[OOQR1G1^1G1^O&MvQUO'#LbOOQR1G1n1G1nOOQR-E=g-E=gOOQR1G7c1G7cO#DvQUO1G7cOGYQUO1G7cO#DvQUO1G7eOOQR1G7e1G7eO&NOQUO'#G}O&NWQUO'#L^OOQQ,5=h,5=hO&NfQUO,5=jO&NkQUO,5=kOOQR1G7f1G7fO#EtQVO1G7fO&NpQUO1G7fO' vQVO,5=kOOQR1G1U1G1UO$/UQUO'#E]O'!lQUO'#E]OOQQ'#LP'#LPO'#VQUO'#LOO'#bQUO,5;UO'#jQUO'#ElO'#}QUO'#ElO'$bQUO'#EtOOQQ'#J]'#J]O'$gQUO,5;cO'%^QUO,5;cO'&XQUO,5;dO''_QVO,5;dOOQQ,5;d,5;dO''iQVO,5;dO''_QVO,5;dO''pQUO,5;bO'(mQUO,5;eO'(xQUO'#KvO')QQUO,5:vO')VQUO,5;fOOQQ1G0n1G0nOOQQ'#J^'#J^O''pQUO,5;bO!4{QUO'#E}OOQQ,5;b,5;bO'*QQUO'#E`O'+zQUO'#E{OHuQUO1G0nO',PQUO'#EbOOQQ'#JY'#JYO'-iQUO'#KxOOQQ'#Kx'#KxO'.cQUO1G0eO'/ZQUO1G3kO'0aQVO1G3kOOQQ1G3k1G3kO'0kQVO1G3kO'0rQUO'#LeO'2OQUO'#K^O'2^QUO'#K]O'2iQUO,59hO'2qQUO1G/aO'2vQUO'#FPOOQR1G1]1G1]OOQR1G2g1G2gO$?TQUO1G2gO'3QQUO1G2gO'3]QUO1G0ZOOQR'#Ja'#JaO'3bQVO1G1XO'9ZQUO'#FTO'9`QUO1G1VO!6qQUO'#JeO'9nQUO,5;|O$0lQUO,5;|OOQQ'#Fc'#FcOOQQ,5;|,5;|O'9|QUO1G1fOOQR1G1f1G1fO':UQUO,5<XO$/UQUO'#FWOBXQUO'#FWO':]QUO,5<XO!(}QVO,5<XO':eQUO,5<XO':jQVO1G1qO!0wQVO1G1qOOQR1G1v1G1vO'@YQUO1G1xOOQR1G1{1G1{O'@_QUO1G1|OBXQUO1G2]O'AhQVO1G1|O'C|QUO1G1|O'DRQUO'#GWO8}QUO1G2]OOQR1G2O1G2OOOQR1G2U1G2UOOQR1G2W1G2WOOQR1G2Y1G2YO'DWQUO1G2^O!4{QUO1G2^OOQR1G2v1G2vO'D`QUO1G2vO$?]QUO1G2`OOQQ'#Cv'#CvO'DeQUO'#G[O'E`QUO'#G[O'EeQUO'#LXO'EsQUO'#G_OOQQ'#LY'#LYO'FRQUO1G2`O'FWQVO1G1kO'HiQVO'#GUOBXQUO'#FWOOQR'#Jf'#JfO'FWQVO1G1kO'HsQUO'#FvOOQR1G2f1G2fO'HxQUO1G2gO'H}QUO'#JhO'3QQUO1G2gO!(}QVO1G2tO'IVQUO1G2xO'J`QUO1G3QO'KfQUO1G3XOOQQ1G3o1G3oO'KzQUO1G3oOOQR1G3Z1G3ZO'LPQUO'#K`O'2vQUO'#LZOGnQUO'#L]OOQR'#Gy'#GyO#DvQUO'#L_OOQR'#HQ'#HQO'LZQUO'#GvO'$bQUO'#GuOOQR1G2{1G2{O'MWQUO1G2{O'M}QUO1G3ZO'NYQUO1G3_O'N_QUO1G3_OOQR1G3_1G3_O'NgQUO'#H]OOQR'#H]'#H]O( pQUO'#H]O!(}QVO'#H`O!(}QVO'#H_OOQR'#La'#LaO( uQUO'#LaOOQR'#Jl'#JlO( zQVO,5=vOOQQ,5=v,5=vO(!RQUO'#H^O(!ZQUO'#HZOOQQ1G3a1G3aO(!eQUO,5@{OOQQ,5@{,5@{O%)fQUO,5@{O%)kQUO,5@{O%$eQUO,5:eO(&SQUO'#KqO(&bQUO'#KqOOQQ,5:e,5:eOOQQ'#JT'#JTO(&mQUO'#D}O(&wQUO'#KwOGnQUO'#L]O('sQUO'#D}OOQQ'#Hp'#HpOOQQ'#Hr'#HrOOQQ'#Hs'#HsOOQQ'#Kr'#KrOOQQ'#JV'#JVO('}QUO,5:hOOQQ,5:h,5:hO((zQUO'#L]O()XQUO'#HtO()oQUO,5@{O()vQUO'#H{O(*RQUO'#LdO(*ZQUO,5>fO(*`QUO'#LcOOQQ1G3}1G3}O(.VQUO1G3}O(.^QUO1G3}O(.eQUO1G4TO(/kQUO1G4TO(/pQUO,5BSO!6qQUO1G4hO!(}QVO'#IiOOQQ1G4m1G4mO(/uQUO1G4mO(1xQVO1G4pPOOO-E<z-E<zPOOO1G.g1G.gPOOO1G.h1G.hP!Am{,UO1G.hP(3xQUO'#LkP(4T{,UO1G.hP(4Y{7[O1G.hPO{O-E=t-E=tPOOO,5BT,5BTP(4b{,UO,5BTPOOO1G5Q1G5QO!(}QVO7+$]O(4gQUO'#CzOOQQ,59_,59_O(4rQbO,59dO(4}QbO,59_OOQQ,59^,59^OOQQ7+)w7+)wO!MmQVO'#JuO(5YQUO,5@pOOQQ1G.p1G.pOOQQ1G2k1G2kO(5bQUO1G2kO(5gQUO7+(sOOQQ7+*X7+*XO(7{QUO7+*XO(8SQUO7+*XO(1xQVO7+*[O#NsQUO7+(sO(8aQVO'#JcO(8tQUO,5ApO(8|QUO,5;vOOQQ'#Cp'#CpOOQQ,5;w,5;wO!(}QVO'#F[OOQQ-E=`-E=`O!MmQVO,5;uOOQQ1G1`1G1`OOQQ,5?l,5?lOOQQ-E=O-E=OOOQR'#Dg'#DgOOQR'#Di'#DiOOQR'#Dl'#DlO(:VQ!eO'#KeO(:^QMkO'#KeO(:eQ!eO'#KeOOQR'#Ke'#KeOOQR'#JR'#JRO(:lQ!eO,59zOOQQ,59z,59zO(:sQbO,5?nOOQQ-E=Q-E=QO(;RQbO1G6jOOQR7+$}7+$}OOQR7+&q7+&qOOQR7+&x7+&xO'9`QUO7+&qO(;^QUO7+&OO#6fQUO7+&OO(<RQUO1G/UO(<iQUO1G/UO(=TQUO7+*ROOQQ7+*V7+*VO(>vQUO,5?uOOQQ-E=X-E=XO(@PQUO7+&ZOOQQ,5@Z,5@ZOOQQ-E=m-E=mO(@UQUO'#LUO@[QVO'#EiO(AbQUO1G1_OOQQ1G1_1G1_O(BkQUO,5@OOOQQ,5@O,5@OOOQQ-E=b-E=bO(CPQUO'#KvOOQR7+,}7+,}O#DvQUO7+,}OOQR7+-P7+-PO(C^QUO,5=iO#ERQUO'#JkO(CoQUO,5AxOOQR1G3U1G3UOOQR1G3V1G3VO(C}QUO7+-QOOQR7+-Q7+-QO(EuQUO,5:wO(GdQUO'#EwO!(}QVO,5;VO(HVQUO,5:wO(HaQUO'#EpO(HrQUO'#EzOOQQ,5;Z,5;ZO#KkQVO'#ExO(IYQUO,5:wO(IaQUO'#EyO#GuQUO'#J[O(JyQUO,5AjOOQQ1G0p1G0pO(KUQUO,5;WO!<_QUO,5;^O(KoQUO,5;_O(K}QUO,5;WO(NaQUO,5;`OOQQ-E=Z-E=ZO(NiQUO1G0}OOQQ1G1O1G1OO) dQUO1G1OO)!jQVO1G1OO)!qQVO1G1OO)!{QUO1G0|OOQQ1G0|1G0|OOQQ1G1P1G1PO)#xQUO'#JpO)$SQUO,5AbOOQQ1G0b1G0bOOQQ-E=[-E=[O)$[QUO,5;iO!<_QUO,5;iO)%XQVO,5:zO)%`QUO,5;gO$ {QUO7+&YOOQQ7+&Y7+&YO!(}QVO'#EfO)%gQUO,5:|OOQQ'#Ky'#KyOOQQ-E=W-E=WOOQQ,5Ad,5AdOOQQ'#Jm'#JmO))[QUO7+&PPOQQ7+&P7+&POOQQ7+)V7+)VO)*SQUO7+)VO)+YQVO7+)VOOQQ,5>m,5>mO$)hQVO'#JtO)+aQUO,5@wOOQQ1G/S1G/SOOQQ7+${7+${O)+lQUO7+(RO)+qQUO7+(ROOQR7+(R7+(RO$?TQUO7+(ROOQQ7+%u7+%uOOQR-E=_-E=_O!0YQUO,5;oOOQQ,5@P,5@POOQQ-E=c-E=cO$0lQUO1G1hOOQQ1G1h1G1hOOQR7+'Q7+'QOOQR1G1s1G1sOBXQUO,5;rO),_QUO,5<YO),fQUO1G1sO)-oQUO1G1sO!0wQVO7+']O)-tQVO7+']O)3dQUO7+'dO)3iQVO7+'hO)5}QUO7+'wO)6XQUO7+'hO)7_QVO7+'hOKnQUO7+'wO$>vQUO,5<rO!4{QUO7+'xO)7fQUO7+'xOOQR7+(b7+(bO)7kQUO7+'zO)7pQUO,5<vO'DeQUO,5<vO)8hQUO,5<vO'DeQUO,5<vOOQQ,5<w,5<wO)8yQVO,5<xO'EsQUO'#JgO)9TQUO,5AsO)9]QUO,5<yOOQR7+'z7+'zO)9hQVO7+'VO)6QQUO'#LTOOQR-E=d-E=dO);yQVO,5<bOOQQ,5@S,5@SO!6qQUO,5@SOOQQ-E=f-E=fO)>bQUO7+(`O)?hQUO7+(dO)?mQVO7+(dOOQQ7+(l7+(lOOQQ7+)Z7+)ZO)?uQUO'#KpO)@PQUO'#KpOOQR,5=b,5=bO)@^QUO,5=bO!;eQUO,5=bO!;eQUO,5=bO!;eQUO,5=bOOQR7+(g7+(gOOQR7+(u7+(uOOQR7+(y7+(yOOQR,5=w,5=wO)@cQUO,5=zO)AiQUO,5=yOOQR,5A{,5A{OOQR-E=j-E=jOOQQ1G3b1G3bO)BoQUO,5=xO)BtQVO'#EfOOQQ1G6g1G6gO%)fQUO1G6gO%)kQUO1G6gOOQQ1G0P1G0POOQQ-E=R-E=RO)E]QUO,5A]O(&SQUO'#JUO)EhQUO,5A]O)EhQUO,5A]O)EpQUO,5:iO8}QUO,5:iOOQQ,5>],5>]O)EzQUO,5AwO)FRQUO'#EVO)G]QUO'#EVO)GvQUO,5:iO)HQQUO'#HlO)HQQUO'#HmOOQQ'#Ku'#KuO)HoQUO'#KuO!(}QVO'#HnOOQQ,5:i,5:iO)IaQUO,5:iO!MmQVO,5:iOOQQ-E=T-E=TOOQQ1G0S1G0SOOQQ,5>`,5>`O)IfQUO1G6gO!(}QVO,5>gO)MTQUO'#JsO)M`QUO,5BOOOQQ1G4Q1G4QO)MhQUO,5A}OOQQ,5A},5A}OOQQ7+)i7+)iO*#VQUO7+)iOOQQ7+)o7+)oO*(UQVO1G7nO**WQUO7+*SO**]QUO,5?TO*+cQUO7+*[POOO7+$S7+$SP*-UQUO'#LlP*-^QUO,5BVP*-c{,UO7+$SPOOO1G7o1G7oO*-hQUO<<GwOOQQ1G.y1G.yOOQQ'#IT'#ITO*/ZQUO,5@aOOQQ,5@a,5@aOOQQ-E=s-E=sOOQQ7+(V7+(VOOQQ<<Ms<<MsO*0dQUO<<MsO*2gQUO<<MvO*4YQUO<<L_O*4nQUO,5?}OOQQ,5?},5?}OOQQ-E=a-E=aOOQQ1G1b1G1bO*5wQUO,5;vO*6}QUO1G1aOOQQ1G1a1G1aOOQR,5AP,5APO*8WQ!eO,5APO*8_QMkO,5APO*8fQ!eO,5APOOQR-E=P-E=POOQQ1G/f1G/fO*8mQ!eO'#DwOOQQ1G5Y1G5YOOQR<<J]<<J]O*8tQUO<<IjO*9iQUO7+$pOOQQ<<Iu<<IuO(8aQVO,5;ROOQR<=!i<=!iOOQQ1G3T1G3TOOQQ,5@V,5@VOOQQ-E=i-E=iOOQR<=!l<=!lO*:fQUO1G0cO*:mQUO'#EzO*:}QUO1G0cO*;UQUO'#JOO*<lQUO1G0qO!(}QVO1G0qOOQQ,5;[,5;[OOQQ,5;],5;]OOQQ,5?v,5?vOOQQ-E=Y-E=YO!<_QUO1G0xO*={QUO1G0xOOQQ1G0y1G0yO*>^QUO'#ElOOQQ1G0z1G0zOOQQ7+&j7+&jO*>rQUO7+&jO*?xQVO7+&jOOQQ7+&h7+&hOOQQ,5@[,5@[OOQQ-E=n-E=nO*@tQUO1G1TO*AOQUO1G1TO*AiQUO1G0fOOQQ1G0f1G0fO*BoQUO'#LRO*BwQUO1G1ROOQQ<<It<<ItOOQQ'#Hb'#HbO',PQUO,5={OOQQ'#Hd'#HdO',PQUO,5=}OOQQ-E=k-E=kPOQQ<<Ik<<IkPOQQ-E=l-E=lOOQQ<<Lq<<LqO*B|QUO'#LgO*DYQUO'#LfOOQQ,5@`,5@`OOQQ-E=r-E=rOOQR<<Km<<KmO$?TQUO<<KmO*DhQUO<<KmOOQR1G1Z1G1ZOOQQ7+'S7+'SO!MmQVO1G1tO*DmQUO1G1tOOQR7+'_7+'_OOQR<<Jw<<JwO!0wQVO<<JwOOQR<<KO<<KOO*DxQUO<<KSO*FOQVO<<KSOKnQUO<<KcO!MmQVO<<KcO*FVQUO<<KSO!0wQVO<<KSO*G`QUO<<KSO*GeQUO<<KcO*GpQUO<<KdOOQR<<Kd<<KdOOQR<<Kf<<KfO*GuQUO1G2bO)7pQUO1G2bO'DeQUO1G2bO*HWQUO1G2dO*I^QVO1G2dOOQQ1G2d1G2dO*IhQVO1G2dO*IoQUO,5@ROOQQ-E=e-E=eOOQQ1G2e1G2eO*I}QUO1G1|O*KWQVO1G1|O*K_QUO1G1|OOQQ1G5n1G5nOOQR<<Kz<<KzOOQR<<LO<<LOO*KdQVO<<LOO*KoQUO<<LOOOQR1G2|1G2|O*KtQUO1G2|O*K{QUO1G3eOOQR1G3d1G3dOOQQ7+,R7+,RO%)fQUO7+,RO*LWQUO1G6wO*LWQUO1G6wO(&SQUO,5?pO*L`QUO,5?pOOQQ-E=S-E=SO*LkQUO1G0TOOQQ1G0T1G0TO*LuQUO1G0TO!MmQVO1G0TO*LzQUO1G0TOOQQ1G3w1G3wO*MUQUO,5:qO)FRQUO,5:qO*MrQUO,5:qO)FRQUO,5:qO$$TQUO,5:uO*NaQVO,5>VO)HQQUO'#JqO*NkQUO1G0TO*N|QVO1G0TOOQQ1G3u1G3uO+ TQUO,5>WO+ `QUO,5>XO+ }QUO,5>YO+#TQUO1G0TO%)kQUO7+,RO+$ZQUO1G4ROOQQ,5@_,5@_OOQQ-E=q-E=qOOQQ<<MT<<MTOOQQ<<Mn<<MnO+%dQUO1G4oP+'gQUO'#JwP+'oQUO,5BWPO{O1G7q1G7qPOOO<<Gn<<GnOOQQANC_ANC_OOQR1G6k1G6kO+'wQ!eO,5:cOOQQ,5:c,5:cO+(OQUO1G0mO+)[QUO7+&]O+*kQUO7+&dO+*|QUO,5;WOOQQ<<JU<<JUO++[QUO7+&oOOQQ7+&Q7+&QO!4{QUO'#J_O+,VQUO,5AmOOQQ7+&m7+&mOOQQ1G3g1G3gO+,_QUO1G3iOOQQ,5>n,5>nO+0SQUOANAXOOQRANAXANAXO+0XQUO7+'`OOQRAN@cAN@cO+1eQVOAN@nO+1lQUOAN@nO!0wQVOAN@nO+2uQUOAN@nO+2zQUOAN@}O+3VQUOAN@}O+4]QUOAN@}OOQRAN@nAN@nO!MmQVOAN@}OOQRANAOANAOO+4bQUO7+'|O)7pQUO7+'|OOQQ7+(O7+(OO+4sQUO7+(OO+5yQVO7+(OO+6QQVO7+'hO+6XQUOANAjOOQR7+(h7+(hOOQR7+)P7+)PO+6^QUO7+)PO+6cQUO7+)POOQQ<= m<= mO+6kQUO7+,cO+6sQUO1G5[OOQQ1G5[1G5[O+7OQUO7+%oOOQQ7+%o7+%oO+7aQUO7+%oO*N|QVO7+%oOOQQ7+)a7+)aO+7fQUO7+%oO+8lQUO7+%oO!MmQVO7+%oO+8vQUO1G0]O*MUQUO1G0]O)FRQUO1G0]OOQQ1G0a1G0aO+9eQUO1G3qO+:kQVO1G3qOOQQ1G3q1G3qO+:uQVO1G3qO+:|QUO,5@]OOQQ-E=o-E=oOOQQ1G3r1G3rO%)fQUO<= mOOQQ7+*Z7+*ZPOQQ,5@c,5@cPOQQ-E=u-E=uOOQQ1G/}1G/}OOQQ,5?y,5?yOOQQ-E=]-E=]OOQRG26sG26sO+;eQUOG26YO!0wQVOG26YO+<nQUOG26YOOQRG26YG26YO!MmQVOG26iO!0wQVOG26iO+<sQUOG26iO+=yQUOG26iO+>OQUO<<KhOOQQ<<Kj<<KjOOQRG27UG27UOOQR<<Lk<<LkO+>aQUO<<LkOOQQ7+*v7+*vOOQQ<<IZ<<IZO+>fQUO<<IZO!MmQVO<<IZO+>kQUO<<IZO+?qQUO<<IZO*N|QVO<<IZOOQQ<<L{<<L{O+@SQUO7+%wO*MUQUO7+%wOOQQ7+)]7+)]O+@qQUO7+)]O+AwQVO7+)]OOQQANEXANEXO!0wQVOLD+tOOQRLD+tLD+tO+BOQUOLD,TO+CUQUOLD,TOOQRLD,TLD,TO!0wQVOLD,TOOQRANBVANBVOOQQAN>uAN>uO+CZQUOAN>uO+DaQUOAN>uO!MmQVOAN>uO+DfQUO<<IcOOQQ<<Lw<<LwOOQR!$( `!$( `O!0wQVO!$( oOOQR!$( o!$( oOOQQG24aG24aO+ETQUOG24aO+FZQUOG24aOOQR!)9EZ!)9EZOOQQLD){LD){O+F`QUO'#CgO(gQUO'#CgO+J]QUO'#CzO+L|QUO'#CzO!FZQUO'#CzO+MuQUO'#CzO+NYQUO'#CzO,#{QUO'#CzO,$]QUO'#CzO,$jQUO'#CzO,$uQbO,59dO,%QQbO,59dO,%]QbO,59dO,%hQbO'#CxO,%yQbO'#CxO,&[QbO'#CxO,&mQUO'#CgO,)QQUO'#CgO,)_QUO'#CgO,,SQUO'#CgO,/VQUO'#CgO,/gQUO'#CgO,3`QUO'#CgO,3gQUO'#CgO,4gQUO'#CgO,6pQUO,5:xO#?yQUO,5:xO#?yQUO,5:xO#=iQUO'#LbO,7^QbO'#CxO,7iQbO'#CxO,7tQbO'#CxO,8PQbO'#CxO#7SQUO'#E^O,8[QUO'#E^O,9iQUO'#HgO,:ZQbO'#CxO,:fQbO'#CxO,:qQUO'#CwO,:vQUO'#CwO,:{QUO'#CpO,;ZQbO,59dO,;fQbO,59dO,;qQbO,59dO,;|QbO,59dO,<XQbO,59dO,<dQbO,59dO,<oQbO,59dO,6pQUO1G0dO,<zQUO1G0dO#?yQUO1G0dO,8[QUO1G0dO,?XQUO'#K`O,?iQUO'#CzO,?wQbO,59dO,6pQUO7+&OO,<zQUO7+&OO,@SQUO'#EwO,@uQUO'#EzO,AfQUO'#E^O,AkQUO'#GcO,ApQUO'#CwO,AuQUO'#CxO,AzQUO'#CxO,BPQUO'#CwO,BUQUO'#GcO,BZQUO'#K`O,BwQUO'#K`O,CRQUO'#CwO,C^QUO'#CwO,CiQUO'#CwO,<zQUO,5:xO,8[QUO,5:xO,8[QUO,5:xO,CtQUO'#K`O,DXQbO'#CxO,DdQUO'#CsO,DiQUO'#E^",
      stateData: ",E_~O(oOSSOSRPQVPQ'ePQ'gPQ'hPQ'iPQ'jPQ'kPQ'lPQ'mPQ(pPQ~O*aOS~OPmO]eOb!]Oe!POmTOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!TxO!VfO!X!XO!Y!WO!i!YO!opO!r!`O!s!aO!t!aO!u!bO!v!aO!x!cO!{!dO#V#QO#a#VO#b#TO#i#OO#p!xO#t!fO#v!eO$R!gO$T!hO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO${!tO$}!uO%U!yO%_#ZO%`#[O%a#YO%c!zO%e#UO%g!{O%l#SO%o!|O%v!}O%|#PO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(wRO)VYO)YaO)[|O)]{O)_iO)`!ZO)bXO)ncO)odO~OR#cOV#^O'e#_O'g#`O'h#aO'i#aO'j#bO'k#bO'l#`O'm#`O(p#]O~OX#eO(t#gO(v#eO~O]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!TjX!VZX!VjX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX(zZX({$]X(|ZX(}ZX)YZX)YjX)ZZX)[ZX)[jX)]ZX)]jX)^ZX)_ZX)`ZX)pZX~O)_jX!UZX~P(gO]$PO!V#nO!X#}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO(|#mO(}#mO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_#lO)`$OO~Oe$TO%Y$UO'[$VO'_$WO)O$QO~Om$XO~O!T$YO])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX~Om$XO~P.^Om$XO!g$[O)p$[O~OX$]O)c$]O~O!R$^O)U)WP)`)WP~OPmO]$gOb!]Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!TxO!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~Om$aO#t$nO(wRO~P0}O](^Xb'zXe(^Xm'zXm(^Xs'zXs(^Xt'zXt(^Xu'zXu(^Xv'zXv(^Xw'zXw(^Xx'zXx(^Xy'zXy(^Xz'zXz(^X|'zX!O'zX!V(^X!o(^X!r'zX!r(^X!s'zX!s(^X!t'zX!t(^X!u'zX!u(^X!v'zX!v(^X!x'zX!x(^X!{(^X#a'zX#b'zX%e'zX%l'zX%o(^X%v(^X&m'zX&r'zX&s'zX(w'zX(w(^X)Y(^X)[(^X)](^X~Ob!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO&r#WO&s$yO])gXe)gXm)gX!V)gX!{)gX%v)gX(w)gX)Y)gX)[)gX)])gX~O)_$xO~P:qOPmO]eOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!VfO!X!XO!Y!WO!i!YO!{!dO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)YaO)[|O)]{O)`!ZO)bXO)ncO)odO~Ob%SOm;RO!|%TO(w$zO~P<oO)Y%UO~Ob!]Om$aO|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w;UO~P<oOPmO]$gOb%SOm;RO!V$hO!W%aO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]%_O)`!ZO)bXO)ncO)odO)p%^O~O]%jOe!POm%dO!V%mO!{!dO%v$oO(w;VO)Y%fO)[%kO)]%kO~O({%oO~O)_#lO~O(w%pO](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX!g(yX)p(yX[(yX!W(yX({(yX!U(yXQ(yX!d(yX~OP%qO(uQO~PCTO]%jOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V%mO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO!{!dO%o!|O%v!}O)Y;gO)[|O)]|O~Om%tO!o%yO(w$zO~PEbO!TxO#v!eO({%{O)p&OO])kX!V)kX~O]%jOe!POm%tO!V%mO!{!dO%v!}O(w$zO)Y;gO)[|O)]|O~O!TxO#v!eO)_&RO)p&SO~O!U&VO~P!QO]&[O!TxO!V&YO)Y&XO)[&]O)]&]O~Oq&WO~PHuO]&eO!V&dO~OPmO]eOe!PO!VfO!X!XO!Y!WO!i!YO!{!dO#V#QO%_#ZO%`#[O%a#YO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)YaO)[|O)]{O)`!ZO)bXO)ncO)odO~Ob%SOm;RO%v$oO(w$zO~PIjO]%jOe!POm;cO!V%mO!{!dO%v$oO(w$zO)Y;gO)[|O)]|O~Oq&hO](yX])kX!V(yX!V)kX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX[(yX[)kX!U(yX~O!g$[O)p$[O~PL`O!g(yX)p(yX~PL`O](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX!g(yX)p(yX[(yX!U(yX~O])kX!V)kX[)kX~PNnOb&jO&m!RO]&lXe&lXm&lXs&lXt&lXu&lXv&lXw&lXx&lXy&lXz&lX!O&lX!V&lX!r&lX!s&lX!t&lX!u&lX!v&lX!x&lX!{&lX%v&lX&r&lX&s&lX(w&lX)Y&lX)[&lX)]&lX)_&lX[&lX!T&lX!X&lX!Y&lX![&lX!^&lX!_&lX!a&lX!b&lX!e&lX!f&lX!h&lX(z&lX(|&lX(}&lX)Z&lX)^&lX)`&lX!g&lX)p&lX!W&lXQ&lX!d&lX({&lX!U&lX#v&lX~Oq&hOm)SX[)SXQ)SX!d)SX!h)SX)`)SX)p)SX~P.^O!g$[O)p$[O](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX[(yX!W(yX({(yX!U(yXQ(yX!d(yX~OPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O])SXe)SXm)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX[)SXQ)SX!d)SX!h)SX)`)SX)p)SX~O]$PO~P!*tO]&nO~O])hXb)hXe)hXm)hXs)hXt)hXu)hXv)hXw)hXx)hXy)hXz)hX|)hX!O)hX!V)hX!o)hX!r)hX!s)hX!t)hX!u)hX!v)hX!x)hX!{)hX#a)hX#b)hX%e)hX%l)hX%o)hX%v)hX&m)hX&r)hX&s)hX(w)hX)Y)hX)[)hX)])hX~O(uQO~P!-^O%U&pO~P!-^O]&qO~O]$PO~O!TxO~O$W&yO(w%pO({&xO~O]&zOx&|O~O]&zO~OPmO]$gOb%SOm;RO!TxO!V$hO!X!XO!Y!WO!i!YO#V#QO#p!xO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w:tO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O]'RO~O!T$YO)_'TO~P!(}O)_'VO~O)_'WO~O(w'XO~O)_'[O~P!(}Om;eO%U'`O%e'`O(w;WO~Ob!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~O({'dO~O)_'fO~P!(}O!TxO(w%pO)p'hO~O(w%pO~O]'kO~O]'lOe%nXm%nX!V%nX!{%nX%v%nX(w%nX)Y%nX)[%nX)]%nX~O]'pO!V'qO!X'nO!g'nO%Z'nO%['nO%]'nO%^'nO%_'rO%`'rO%a'nO(}'oO)p'nO*O'sO~P8}O]%jOb!TOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V%mO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO!{!dO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO)Y;gO)[|O)]|O~Om;fOq&WO%v$oO(w;XO~P!8mO(w%pO({'xO)_'yO~O]&eO!T'{O~Om$qO!O!_O!T(SO!l(XO(w$pO({(RO)VYO~Om$qO|(`O!T(]O#b(`O(w$pO~Ob!TOm$qO|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~O](bO~OPmOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)bXO)ncO)odO~O](dO)`(eO~P!=XO]$PO~P!<_OPmO]$gOb%SOm;RO!V(kO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O(q(lO(r(lO(s(nO~OY(oO(uQO(w%pO~O'f(rO~OS(vO(p#]O*^(uO~O]$PO(o(yO~Q'nXX#eO(t({O(v#eO~Oe)VOm)QO&r#WO(w)PO~O!Y'Sa!['Sa!^'Sa!_'Sa!a'Sa!b'Sa!e'Sa!f'Sa!h'Sa(z'Sa)Y'Sa)Z'Sa)['Sa)]'Sa)^'Sa)_'Sa)`'Sa!g'Sa)p'Sa['Sa!W'Sa({'Sa!U'SaQ'Sa!d'Sa~OPmOb%SOm;RO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)bXO)ncO)odO]'Sa!V'Sa!X'Sa(|'Sa(}'Sa~P!BmO!T$YO[(xP~P!(}O]oX]%WXeoXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!ToX!VoX!V%WX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!e%WX!f%WX!gnX!h%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX(z%WX(|%WX(}%WX)YoX)Y%WX)Z%WX)[oX)[%WX)]oX)]%WX)^%WX)_%WX)`%WX)pnX[%WX~O)_oX[oX!U%WX~P!FZO])iO!V)jO!X)gO!g)gO%Z)gO%[)gO%])gO%^)gO%_)kO%`)kO%a)gO(})hO)p)gO*O)lO~P8}OPmO]$gOb%SOm;RO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O!V)qO~P!KVOe)tO%Y)uO)O$QO~O!T$YO!V)wO(|)xO!U)xP~P!KVO!T$YO~P!(}O)a*PO~Om*QO]!QX!h!QX)U!QX)`!QX~O]*SO!h*TO)U)WX)`)WX~O)U*WO)`*XO~Oe$TO%Y*YO'[$VO'_$WO)O$QO~Om*ZO~Om*ZO[)SX~P.^Om*ZO!g$[O)p$[O~O)_*[O~P:qOPmO]$gOb!]Om$aOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~Oq&hO~P!&}Oq&hO!W(yX({(yXQ(yX!d(yX~PNnO]'pO!V'qO!X'nO!g'nO%Z'nO%['nO%]'nO%^'nO%_'rO%`'rO%a'nO(}'oO)p'nO*O'sO~O]jXejXmhXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX!TjX!hjX)`jX)pjX[jX~O!ljX({jX)_jX!XjX!YjX![jX!^jX!_jX!ajX!bjX!ejX!fjX(zjX(|jX(}jX)ZjX)^jX!gjX!WjXQjX!djX!UjX#vjX#TjX#VjX#pjXbjX|jX!ojX#ajX#bjX#ijX#tjX${jX%cjX%ejX%kjX%ljX%ojX&mjX)VjX~P#&XO)O*`O~Om*aO~O])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX!T)SX!X)SX!Y)SX![)SX!^)SX!_)SX!a)SX!b)SX!e)SX!f)SX!h)SX(z)SX(|)SX(})SX)Z)SX)^)SX)`)SX!g)SX)p)SX[)SX!W)SXQ)SX!d)SX({)SX!U)SX#v)SX~Om*aO~P#+aOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO])gae)gam)ga!V)ga!{)ga%v)ga(w)ga)Y)ga)[)ga)])gaQ)ga!d)ga!h)ga)`)ga)p)ga[)ga!T)ga({)ga)_)ga~O&r#WO&s$yO~P#/POq&hOm)SX~P#+aO&r)ga~P#/PO]ZXmhXqZXqjX!TjX!VZX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX(zZX(|ZX(}ZX)YZX)ZZX)[ZX)]ZX)^ZX)_ZX)`ZX)pZX[ZX~O!WZX({ZX!UZXQZX!dZX~P#1xO]$PO!V#nO!X#}O(|#mO(}#mO~O!Y&xa![&xa!^&xa!_&xa!a&xa!b&xa!e&xa!f&xa!g&xa!h&xa(z&xa)Y&xa)Z&xa)[&xa)]&xa)^&xa)_&xa)`&xa)p&xa[&xa!W&xa({&xa!U&xaQ&xa!d&xa~P#4YOm;oO!T$YO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~PKnOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!|%TO~PKnO]&eO!V&dO[#Qa!T#Qa!h#Qa#v#Qa)_#Qa)p#QaQ#Qa!d#Qa({#Qa~Oq&hO!T$YO~O[*hO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[*hO~O[*jO]&eO!V&dO~O]&[Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V&YO&r#WO&s$yO)Y&XO)[&]O)]&]O~O[rXQrX!drX!hrX)`rX)_rX~P#:ZO[*mO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h*nO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!W)qX~P#4YO!W*pO!h*qO~O!W*pO!h*qO~P!(}O!W*pO~Oq&hO!g$[O!h*rO)p$[O](yX!V(yX!W(yX!W*UX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)`(yX~O!h(yX~P#=iO!W*tO~Oe$TO%Y*YO)O:yO~Om;rO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!|%TO~PBXO]*{O!T*vO!V&dO!h*yO#v!eO)p*wO)_)wX~O!h*yO)_)wX~O)_*|O~Oq&hO])kX!T)kX!V)kX!h)kX#v)kX)_)kX)p)kX[)kXQ)kX!d)kX({)kX~Oq&hO~OP%qO(uQO]%ha!V%ha!X%ha!Y%ha![%ha!^%ha!_%ha!a%ha!b%ha!e%ha!f%ha!h%ha(w%ha(z%ha(|%ha(}%ha)Y%ha)Z%ha)[%ha)]%ha)^%ha)_%ha)`%ha!g%ha)p%ha[%ha!W%ha({%ha!U%haQ%ha!d%ha~Oe$TO%Y$UO)O:vO~Om;OO~O!TxO#v!eO)p&OO~Om<cO&r#WO(w;nO~O$Z+YO%`+ZO~O!TxO#v!eO)_+[O)p+]O~OPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO$Z+YO%_#ZO%`+_O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O!U+`O~P!QOb!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#a+fO#b+gO#i+hO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO)VYO~OQ)rP!d)rP~P#GuO]&[Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V&YO)Y&XO)[&]O)]&]O~O[#kX!T#kX#v#kX)_#kX)p#kXQ#kX!d#kX!h#kX)`#kX!x#kX({#kX~P#IyOPmO]$gOb%SOm;ROs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V$hO!W+nO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y+oO)]$mO)`!ZO)bXO)ncO)odO~O]&eO!V+pO~O]&[O!V&YO)VYO)Y&XO)[&]O)]&]O)`+sO[)jP~P8}O]&[O!V&YO)Y&XO)[&]O)]&]O~O[#nX!T#nX#v#nX)_#nX)p#nXQ#nX!d#nX!h#nX)`#nX!x#nX({#nX~P#NsO!TxO])tX!V)tX~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O#T+{O#p+|O(}+yO)[+wO)]+wO~O]#jX!T#jX!V#jX[#jX#v#jX)_#jX)p#jXQ#jX!d#jX!h#jX)`#jX!x#jX({#jX~P$!WO#V,OO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!l,PO#T+{O#V,OO#p+|O(}+yO)[,PO)],PO])lP!T)lP!V)lP#v)lP({)lP)p)lP[)lP!h)lP)_)lP~O!x)lPQ)lP!d)lP~P$$TOPmO]$gOb%SOm;ROs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)]$mO)`!ZO)bXO)ncO)odO~O!W,VO)Y,WO~P$&OO)VYO)`+sO[)jP~P8}O]&eO!V&dO[&Za!T&Za!h&Za#v&Za)_&Za)p&ZaQ&Za!d&Za({&Za~OPmO]$gOb!]Om;TOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;YO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~OQ)PP!d)PP~P$)hO]$PO!V#nO(|#mO(}#mO!X'Pa!Y'Pa!['Pa!^'Pa!_'Pa!a'Pa!b'Pa!e'Pa!f'Pa!h'Pa(z'Pa)Y'Pa)Z'Pa)['Pa)]'Pa)^'Pa)_'Pa)`'Pa!g'Pa)p'Pa['Pa!W'Pa({'Pa!U'PaQ'Pa!d'Pa~O]$PO!V#nO!X#}O(|#mO(}#mO~P!BmO!TxO#t!fO)VYO~P8}O!TxO(w%pO)p,aO~O#x,fO~OQ)gX!d)gX!h)gX)`)gX)p)gX[)gX!T)gX({)gX)_)gX~P:qO({,jO(|,hO)V$UX)_$UX~O(w,kO~O)VYO)_,nO~OPmO]$gOb!]Om;SOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O(w;ZO~P$0yOPmO]$gOb%SOm;RO!TxO!V$hO!X!XO!Y!WO!i!YO#V#QO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w:tO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O$h,xO~OPmO]$gOb!]Om;SOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO$}!uO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O${-OO(w;UO)_,|O~P$7dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-QO)`$OO~P#4YO)_-QO~O)_-RO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-SO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-TO)`$OO~P#4YOq&hO)VYO)p-VO~O)_-WO~Om;eO(w;WO~O]-_O!{!dO&r#WO&s$yO(w-ZO)Y-[O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO({-bO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xa!o$Xa!{$Xa#i$Xa#p$Xa#t$Xa#v$Xa$R$Xa$T$Xa$Y$Xa$Z$Xa${$Xa%U$Xa%c$Xa%g$Xa%o$Xa%|$Xa(l$Xa)[$Xa!U$Xa$c$Xa~P$0yO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-hO)`$OO~P#4YOm-jO!TxO)p,aO~O)p-lO~O]&]a!X&]a!Y&]a![&]a!^&]a!_&]a!a&]a!b&]a!e&]a!f&]a!h&]a(z&]a(|&]a(}&]a)Z&]a)[&]a)]&]a)^&]a)_&]a)`&]a!g&]a)p&]a[&]a!W&]a!T&]a#v&]a({&]a!U&]aQ&]a!d&]a~O)Y-pO!V&]a~P$DpO[-pO~O!W-pO~O!V-qO)Y&]a~P$DpO])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX~Om;tO~P$G`O]&eO!V&dO)_-rO~Om;jO!o-uO#V,OO#i-zO#t!fO${-OO%c!zO%k-yO%o!|O%v!}O(w;[O)VYO~P!8mO!n.OO(w,kO~O)VYO)_.QO~OPmO]$gOb%SOm;RO!T.VO!V$hO!X!XO!Y!WO!i!YO#V.^O#a.]O%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO(}.UO)Y$mO)]$mO)_.SO)`!ZO)bXO)ncO)odO~O!U.[O~P$JpO])dXe)dXs)dXt)dXu)dXv)dXw)dXx)dXy)dXz)dX!O)dX!T)dX!V)dX!l)dX!r)dX!s)dX!t)dX!u)dX!v)dX!x)dX!{)dX%v)dX&r)dX&s)dX(w)dX({)dX)Y)dX)[)dX)])dX)_)dX[)dX!h)dX)`)dX!X)dX!Y)dX![)dX!^)dX!_)dX!a)dX!b)dX!e)dX!f)dX(z)dX(|)dX(})dX)Z)dX)^)dX!g)dX)p)dX!W)dXQ)dX!d)dX#T)dX#V)dX#p)dX#v)dXb)dX|)dX!o)dX#a)dX#b)dX#i)dX#t)dX${)dX%c)dX%e)dX%k)dX%l)dX%o)dX&m)dX)V)dX!U)dX~Om*aO~P$LzOm$qO!T(SO!l.cO(w$pO({(RO)VYO~Oq&hOm)dX~P$LzOm$qO!n.hO!o.hO(w$pO)VYO~Om;kO!U.sO!n.uO!o.tO#i-zO${!tO$}!uO%g!{O%k-yO%o!|O%v!}O(w;^O)VYO~P!8mO!T(SO!l.cO({(RO])TXe)TXm)TXs)TXt)TXu)TXv)TXw)TXx)TXy)TXz)TX!O)TX!V)TX!r)TX!s)TX!t)TX!u)TX!v)TX!x)TX!{)TX%v)TX&r)TX&s)TX(w)TX)Y)TX)[)TX)])TX~O)_)TX[)TX!X)TX!Y)TX![)TX!^)TX!_)TX!a)TX!b)TX!e)TX!f)TX!h)TX(z)TX(|)TX(})TX)Z)TX)^)TX)`)TX!g)TX)p)TX!W)TXQ)TX!d)TX!U)TX#v)TX~P%%sO!T(SO~O!T(SO({(RO~O(w%pO!U*WP~O!T(]O({.zO]&kae&kam&kas&kat&kau&kav&kaw&kax&kay&kaz&ka!O&ka!V&ka!r&ka!s&ka!t&ka!u&ka!v&ka!x&ka!{&ka%v&ka&r&ka&s&ka(w&ka)Y&ka)[&ka)]&ka)_&ka[&ka!X&ka!Y&ka![&ka!^&ka!_&ka!a&ka!b&ka!e&ka!f&ka!h&ka(z&ka(|&ka(}&ka)Z&ka)^&ka)`&ka!g&ka)p&ka!W&kaQ&ka!d&ka!U&ka#v&ka~Om$qO!T(]O(w$pO~O&r#WO&s$yO]&pae&pam&pas&pat&pau&pav&paw&pax&pay&paz&pa!O&pa!V&pa!r&pa!s&pa!t&pa!u&pa!v&pa!x&pa!{&pa%v&pa(w&pa)Y&pa)[&pa)]&pa)_&pa[&pa!T&pa!X&pa!Y&pa![&pa!^&pa!_&pa!a&pa!b&pa!e&pa!f&pa!h&pa(z&pa(|&pa(}&pa)Z&pa)^&pa)`&pa!g&pa)p&pa!W&paQ&pa!d&pa({&pa!U&pa#v&pa~O&s/PO~P!(}O!Y#sO![#tO!f#|O)Y#oO!^'Ua!_'Ua!a'Ua!b'Ua!e'Ua!h'Ua(z'Ua)Z'Ua)['Ua)]'Ua)^'Ua)_'Ua)`'Ua!g'Ua)p'Ua['Ua!W'Ua({'Ua!U'UaQ'Ua!d'Ua~P#4YO!V'dX!X'dX!Y'dX!['dX!^'dX!_'dX!a'dX!b'dX!e'dX!f'dX!h'dX(z'dX(|'dX(}'dX)Y'dX)Z'dX)['dX)]'dX)^'dX)`'dX['dX~O]/RO)_'dX!g'dX)p'dX!W'dX({'dX!U'dXQ'dX!d'dX~P%3WO!Y#sO![#tO!f#|O)Y#oO!^'Wa!_'Wa!a'Wa!b'Wa!e'Wa!h'Wa(z'Wa)Z'Wa)['Wa)]'Wa)^'Wa)_'Wa)`'Wa!g'Wa)p'Wa['Wa!W'Wa({'Wa!U'WaQ'Wa!d'Wa~P#4YO]$PO!T$YO!V/SO&r#WO&s$yO~O!X'Za!Y'Za!['Za!^'Za!_'Za!a'Za!b'Za!e'Za!f'Za!h'Za(z'Za(|'Za(}'Za)Y'Za)Z'Za)['Za)]'Za)^'Za)_'Za)`'Za!g'Za)p'Za['Za!W'Za({'Za!U'ZaQ'Za!d'Za~P%6}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^a)_'^a!g'^a)p'^a['^a!W'^a({'^a!U'^aQ'^a!d'^a~P#4YOPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]%_O)`!ZO)bXO)ncO)odO)p%^O~O!W/VO~P%:}O(q(lO(r(lO(s/XO~OS(vO]$PO(p#]O*^(uO~O]/[O'f/]O*^/YO~OS/aO(p#]O*^/`O~O]$PO~Q'na!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO({/cO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_#Zi[#Zi~P#4YO]dXmhXqdXqjX!VdX!XdX!YdX![dX!^dX!_dX!adX!bdX!edX!fdX!gdX!hdX(zdX(|dX(}dX)YdX)ZdX)[dX)]dX)^dX)_dX)`dX)pdX[dX!WdX({dX!TdX#vdX!UdXQdX!ddX~Oe/eO%Y*YO)O/dO~Om/fO~Om/gO~Oq&hO]ci!Vci!Xci!Yci![ci!^ci!_ci!aci!bci!eci!fci!gci!hci(zci(|ci(}ci)Yci)Zci)[ci)]ci)^ci)_ci)`ci)pci[ci!Wci({ci!UciQci!dci~O!W/iO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO![#tO)Y#oO!Y&zi!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y&zi![&zi!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Y&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)[#pO)]#rO)^#jO!h&zi(z&zi)Z&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!^&zi!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!^&zi!_&zi!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!a#zO!b#{O!e#{O!f#|O)Y#oO)^#jO!^&zi!_&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!b#{O!e#{O!f#|O)Y#oO)^#jO!^&zi!_&zi!a&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!f#|O)Y#oO!^&zi!_&zi!a&zi!b&zi!e&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO)Y#oO!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)Z#qO)[#pO)]#rO)^#jO!h&zi(z&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h/jO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[(xX~P#4YO!h/jO[(xX~O[/lO~O]%Xaq%Xa!X%Xa!Y%Xa![%Xa!^%Xa!_%Xa!a%Xa!b%Xa!e%Xa!f%Xa!h%Xa(z%Xa(|%Xa(}%Xa)Z%Xa)[%Xa)]%Xa)^%Xa)_%Xa)`%Xa!g%Xa)p%Xa[%Xa!W%Xa!T%Xa#v%Xa({%Xa!U%XaQ%Xa!d%Xa~O)Y/mO!V%Xa~P&,zO[/mO~O!W/mO~O!V/nO)Y%Xa~P&,zO!X'Zi!Y'Zi!['Zi!^'Zi!_'Zi!a'Zi!b'Zi!e'Zi!f'Zi!h'Zi(z'Zi(|'Zi(}'Zi)Y'Zi)Z'Zi)['Zi)]'Zi)^'Zi)_'Zi)`'Zi!g'Zi)p'Zi['Zi!W'Zi({'Zi!U'ZiQ'Zi!d'Zi~P%6}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^i)_'^i!g'^i)p'^i['^i!W'^i({'^i!U'^iQ'^i!d'^i~P#4YO!W/sO~P%:}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h/uO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U)xX~P#4YO(w/xO~O!V/zO(|)xO)p/|O~O!h/uO!U)xX~O!U/}O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h`i(z`i)_`i!g`i)p`i[`i!W`i({`i!U`iQ`i!d`i~P#4YO!R0OO~Om*QO]!Qa!h!Qa)U!Qa)`!Qa~OP0WO]0VOm0WO!R0WO!T0TO!V0UO!X0WO!Y0WO![0WO!^0WO!_0WO!a0WO!b0WO!e0WO!f0WO!g0WO!h0WO!i0WO(uQO({0WO(|0WO(}0WO)Y0QO)Z0RO)[0RO)]0SO)^#jO)_0WO)`0WO)bXO~O[0ZO~P&7dO!R$^O~O!h*TO)U)Wa)`)Wa~O)U0_O~O])iO!V)jO!X)gO!g)gO%Z)gO%[)gO%])gO%^)gO%_)kO%`)kO%a)gO(})hO)p)gO*O)lO~Oe)tO%Y*YO)O$QO~O)_0aO~O]oXeoXmnXqoXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!VoX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX!ToX!hoX)`oX[oXQoX!doX~O!loX({oX)_oX!XoX!YoX![oX!^oX!_oX!aoX!boX!eoX!foX(zoX(|oX(}oX)ZoX)^oX!goX)poX!WoX!UoX#voX#ToX#VoX#poXboX|oX!ooX#aoX#boX#ioX#toX${oX%coX%eoX%koX%loX%ooX&moX)VoX~P&;`Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO~O])gie)gim)gi!V)gi!{)gi%v)gi(w)gi)Y)gi)[)gi)])giQ)gi!d)gi!h)gi)`)gi)p)gi[)gi!T)gi&r)gi({)gi)_)gi~P&@^O]&eO!V&dO[#Qi!T#Qi!h#Qi#v#Qi)_#Qi)p#QiQ#Qi!d#Qi({#Qi~O[raQra!dra!hra)`ra)_ra~P#:ZO[raQra!dra!hra)`ra)_ra~P#IyO]&eO!V+pO[raQra!dra!hra)`ra)_ra~O!h*nO!W)qa~O!h*rO!W*Ua~OPmOb!]Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!X!XO!Y!WO!i!YO!s!aO!t!aO!v!aO!x!cO#V#QO#a#VO#b#TO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%e#UO%l#SO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)_iO)`!ZO)bXO)ncO)odO~O]eOe!POmTO!T*vO!U&VO!V0oO!opO!r!`O!u!bO!{!dO#i#OO#p!xO#t!fO$R!gO$T!hO${!tO$}!uO%U!yO%c!zO%g!{O%o!|O%v!}O%|#PO(wRO(|)xO)YaO)[|O)]{O~P&E`O!h*yO)_)wa~OPmO]$gOb!]Om;TO|#RO!T$YO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;]O)VYO)Y$mO)]$mO)`0uO)bXO)ncO)odO[(xP[)jP~P&@^O!h*rO!W*UX~O]$PO!T$YO~O!h0zO!T*QX#v*QX)p*QX~O)_0|O~O)_0}O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_1PO)`$OO~P#4YO)_0}O~P!?ZO]1ZOe!POm%dO!V1XO!{!dO%v$oO(w$zO)Y1RO)`1UO~O)[1VO)]1VO)p1SOQ#PX!d#PX!h#PX[#PX~P' }O!h1[OQ)rX!d)rX~OQ1^O!d1^O~O)`1aO)p1`OQ#`X!d#`X!h#`X~P!<_O)`1aO)p1`OQ#`X!d#`X!h#`X~P!;eOq&WO~O[#ka!T#ka#v#ka)_#ka)p#kaQ#ka!d#ka!h#ka)`#ka!x#ka({#ka~P#IyO]&eO!V+pO[#ka!T#ka#v#ka)_#ka)p#kaQ#ka!d#ka!h#ka)`#ka!x#ka({#ka~O!W1fO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W1fO)Y1hO~P$&OO!W1fO~P!(}O]#ja!T#ja!V#ja[#ja#v#ja)_#ja)p#jaQ#ja!d#ja!h#ja)`#ja!x#ja({#ja~P$!WO[1lO]&eO!V+pO~O!h1mO[)jX~O[1oO~O]&eO!V+pO[#na!T#na#v#na)_#na)p#naQ#na!d#na!h#na)`#na!x#na({#na~O]1sOs#SXt#SXu#SXv#SXw#SXx#SXy#SXz#SX!T#SX!V#SX#T#SX#p#SX(}#SX)[#SX)]#SX!l#SX!x#SX#V#SX#v#SX({#SX)p#SX[#SX!h#SX)_#SXQ#SX!d#SX)`#SX~O]1tO~O]1wOm$qO!V$hO#V#QO(w$pO)ncO)odO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!l,PO#T+{O#V,OO#p+|O(}+yO)[,PO)],PO~O])lX!T)lX!V)lX!x)lX#v)lX({)lX)p)lX[)lX!h)lX)_)lXQ)lX!d)lX~P',hO!x!cO]#Ri!T#Ri!V#Ri#v#Ri({#Ri)p#Ri[#Ri!h#Ri)_#RiQ#Ri!d#Ri~O!W2PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W2PO)Y2RO~P$&OO!W2PO~P!(}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ*XX!d*XX!h*XX~P#4YO)`2SOQ)QX!d)QX!h)QX~O!h2TOQ)PX!d)PX~OQ2VO!d2VO~O[2WO~O#t$nO)VYO~P8}Om-jO!TxO)p2[O~O[2]O~O#x,fOP#ui]#uib#uie#uim#uis#uit#uiu#uiv#uiw#uix#uiy#uiz#ui|#ui!O#ui!T#ui!V#ui!X#ui!Y#ui!i#ui!o#ui!r#ui!s#ui!t#ui!u#ui!v#ui!x#ui!{#ui#V#ui#a#ui#b#ui#i#ui#p#ui#t#ui#v#ui$R#ui$T#ui$Y#ui$Z#ui$`#ui$e#ui$g#ui$h#ui$k#ui$m#ui$o#ui$q#ui$s#ui$u#ui$w#ui${#ui$}#ui%U#ui%_#ui%`#ui%a#ui%c#ui%e#ui%g#ui%l#ui%o#ui%v#ui%|#ui&m#ui&r#ui&s#ui'Q#ui'R#ui'V#ui'Y#ui'a#ui'b#ui(l#ui(u#ui(w#ui)V#ui)Y#ui)[#ui)]#ui)_#ui)`#ui)b#ui)n#ui)o#ui!U#ui$c#ui!n#ui%k#ui~O]&eO~O]&eO!TxO!V&dO#v!eO~O({2bO(|,hO)V$Ua)_$Ua~O)VYO)_2dO~O[2eO~P,`O[2eO)_#lO~O[2eO~O$c2jOP$_i]$_ib$_ie$_im$_is$_it$_iu$_iv$_iw$_ix$_iy$_iz$_i|$_i!O$_i!T$_i!V$_i!X$_i!Y$_i!i$_i!o$_i!r$_i!s$_i!t$_i!u$_i!v$_i!x$_i!{$_i#V$_i#a$_i#b$_i#i$_i#p$_i#t$_i#v$_i$R$_i$T$_i$Y$_i$Z$_i$`$_i$e$_i$g$_i$h$_i$k$_i$m$_i$o$_i$q$_i$s$_i$u$_i$w$_i${$_i$}$_i%U$_i%_$_i%`$_i%a$_i%c$_i%e$_i%g$_i%l$_i%o$_i%v$_i%|$_i&m$_i&r$_i&s$_i'Q$_i'R$_i'V$_i'Y$_i'a$_i'b$_i(l$_i(u$_i(w$_i)V$_i)Y$_i)[$_i)]$_i)_$_i)`$_i)b$_i)n$_i)o$_i!U$_i~O]1wO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_2mO)`$OO~P#4YOPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)_2pO)`!ZO)bXO)ncO)odO~P&@^O)_2mO~O(w-ZO~O)VYO)p2sO~O)_2uO~O]-_Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO!|%TO(w-ZO)Y-[O~O)Y2zO~O]&eO!V2|O!h2}O)_){X~O]-_O!{!dO(w-ZO)Y-[O~O)_3QO~O!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xi!o$Xi!{$Xi#i$Xi#p$Xi#t$Xi#v$Xi$R$Xi$T$Xi$Y$Xi$Z$Xi${$Xi%U$Xi%c$Xi%g$Xi%o$Xi%|$Xi(l$Xi)[$Xi!U$Xi$c$Xi~P$0yOm;SO(w:uO~P0}O]3UO~O)_2ZO~O!u3WO(w%pO~O[3ZO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h3[O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[3]O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO]&eO!V+pO!T%ui#v%ui)_%ui)p%ui~O!W3^O~Om;QO)_)SX~P$G`Ob!TOm$qO|3dO#a#VO#b3cO#t!fO%e#UO%l3eO&m!RO&r#WO&s!TO(w$pO)VYO~P&@^Om;jO!o-uO#i-zO#t!fO${-OO%c!zO%k-yO%o!|O%v!}O(w;[O)VYO~P!8mO]&eO!V&dO)_3gO~O)_3hO~O)VYO)_3hO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_3iO)`$OO~P#4YO)_3iO~O)_3lO~O!U3nO~P$JpOm$qO(w$pO~O]3pO!T'{O~P',SO!T(SO!l3sO({(RO])Tae)Tam)Tas)Tat)Tau)Tav)Taw)Tax)Tay)Taz)Ta!O)Ta!V)Ta!r)Ta!s)Ta!t)Ta!u)Ta!v)Ta!x)Ta!{)Ta%v)Ta&r)Ta&s)Ta(w)Ta)Y)Ta)[)Ta)])Ta)_)Ta[)Ta!X)Ta!Y)Ta![)Ta!^)Ta!_)Ta!a)Ta!b)Ta!e)Ta!f)Ta!h)Ta(z)Ta(|)Ta(})Ta)Z)Ta)^)Ta)`)Ta!g)Ta)p)Ta!W)TaQ)Ta!d)Ta!U)Ta#v)Ta~Om$qO!n.hO!o.hO(w$pO~O!h3wO)`3yO!T)eX~O!o3{O)VYO~P8}O)_3|O~PGYO]4ROm)QO!T$YO!{!dO%v$oO&r#WO(w)PO({4VO)Y4OO)[4SO)]4SO~O)_4WO)p4YO~P('OOm;kO!U4[O!n.uO!o.tO#i-zO${!tO$}!uO%g!{O%k-yO%o!|O%v!}O(w;^O)VYO~P!8mOm;kO%v!}O(w;^O~P!8mO({4]O~Om$qO!T(SO(w$pO({(RO)VYO~O!l3sO~P()^O)p4_O!U&oX!h&oX~O!h4`O!U*WX~O!U4bO~Ob4dOm$qO&m!RO(w$pO~O!T(]O]&kie&kim&kis&kit&kiu&kiv&kiw&kix&kiy&kiz&ki!O&ki!V&ki!r&ki!s&ki!t&ki!u&ki!v&ki!x&ki!{&ki%v&ki&r&ki&s&ki(w&ki)Y&ki)[&ki)]&ki)_&ki[&ki!X&ki!Y&ki![&ki!^&ki!_&ki!a&ki!b&ki!e&ki!f&ki!h&ki(z&ki(|&ki(}&ki)Z&ki)^&ki)`&ki!g&ki)p&ki!W&kiQ&ki!d&ki!U&ki#v&ki~O({&ki~P(*nO({.zO~P(*nO[4gO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[4gO~O[4hO~O]$PO!T$YO!V'Zi!X'Zi!Y'Zi!['Zi!^'Zi!_'Zi!a'Zi!b'Zi!e'Zi!f'Zi!h'Zi(z'Zi(|'Zi(}'Zi)Y'Zi)Z'Zi)['Zi)]'Zi)^'Zi)_'Zi)`'Zi!g'Zi)p'Zi['Zi!W'Zi({'Zi!U'ZiQ'Zi!d'Zi~OPmOb%SOm;RO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)`!ZO)bXO)ncO)odO]#]aq#]a!T#]a!V#]a)Y#]a)[#]a)]#]a~O(w%pO)`4mO[*`P~O*^4lO~O'f4oO*^4lO~O*^4pO~OmnXqoXq&wX~Oe4rO%Y*YO)O/dO~Oe4rO%Y*YO)O4sO~O!h/jO[(xa~O!W4wO~O]&eO!V+pO!T%uq#v%uq)_%uq)p%uq~O]$PO!T$YO!X'Zq!Y'Zq!['Zq!^'Zq!_'Zq!a'Zq!b'Zq!e'Zq!f'Zq!h'Zq(z'Zq(|'Zq(}'Zq)Y'Zq)Z'Zq)['Zq)]'Zq)^'Zq)_'Zq)`'Zq!g'Zq)p'Zq['Zq!W'Zq({'Zq!U'ZqQ'Zq!d'Zq~O!V'Zq~P(5{O!V/SO&r#WO&s$yO~P(5{O!T$YO!V)wO(|)xO!U(VX!h(VX~P!KVO!h/uO!U)xa~O!W5PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h*nO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!U5TO~P&7dO!W5TO~P&7dO[5TO~P&7dO[5YO~P&7dO]5ZO!h'va)U'va)`'va~O!h*TO)U)Wi)`)Wi~O]&eO!V&dO[#Qq!T#Qq!h#Qq#v#Qq)_#Qq)p#QqQ#Qq!d#Qq({#Qq~O[riQri!dri!hri)`ri)_ri~P#IyO]&eO!V+pO[riQri!dri!hri)`ri)_ri~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'Tq)_'Tq!g'Tq)p'Tq['Tq!W'Tq({'Tq!U'TqQ'Tq!d'Tq~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!W'}a!h'}a~P#4YO!W5`O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h5aO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_#lO)`$OO!U)xX~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h#{i)_#{i~P#4YO]*{O!T$YO!V&dO)p*wO!h(Wa)_(Wa~O!h1mO[)jX]'dX~P%3WO)`5cO!T%qa!h%qa#v%qa)p%qa~O!h0zO!T*Qa#v*Qa)p*Qa~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_5fO)`$OO~P#4YO]1ZOe!POm;cO!V1XO!{!dO%v$oO(w$zO)Y<PO)[5hO)]5hO~OQ#Pa!d#Pa!h#Pa[#Pa~P(ETO]1ZOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V1XO!{!dO!|%TO%v$oO(w$zOQ#kX!d#kX!h#kX[#kX~Om%dO)Y1RO)[<QO)]<QO~P(FVO]&eOQ#Pa!d#Pa!h#Pa[#Pa~O!V&dO)p5lO~P(GtO(w%pOQ#dX!d#dX!h#dX[#dX~O)[<QO)]<QOQ#nX!d#nX!h#nX[#nX~P' }O!V+pO~P(GtO]1ZOb!TOe!POm;dO|#RO!V1XO!{!dO#a#VO#b#TO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO(w;XO)VYO)Y<PO)[5hO)]5hO)`+sO[)jP~P&@^O!h1[OQ)ra!d)ra~Oq&hO)p5qOQ#`am)SX!d#`a!h#`a)`)SX~P$G`O(w-ZOQ#ga!d#ga!h#ga~Oq&hO)p5qOQ#`a])dXe)dXm)dXs)dXt)dXu)dXv)dXw)dXx)dXy)dXz)dX!O)dX!T)dX!V)dX!d#`a!h#`a!l)dX!r)dX!s)dX!t)dX!u)dX!v)dX!x)dX!{)dX%v)dX&r)dX&s)dX(w)dX({)dX)Y)dX)[)dX)])dX)`)dX~O#a5tO#b5tO~O]&eO!V+pO[#ki!T#ki#v#ki)_#ki)p#kiQ#ki!d#ki!h#ki)`#ki!x#ki({#ki~O!W5vO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W5vO~P!(}O!W5vO)Y5xO~P$&OO]#ji!T#ji!V#ji[#ji#v#ji)_#ji)p#jiQ#ji!d#ji!h#ji)`#ji!x#ji({#ji~P$!WO)VYO)`5zO~P8}O!h1mO[)ja~O&r#WO&s$yO!T#qa!x#qa#v#qa({#qa)p#qa[#qa!h#qa)_#qaQ#qa!d#qa)`#qa~P#NsO[6PO~P!(}O[)uP~P!4{O)Z6VO)[6TO]#Ua!T#Ua!V#Ua)Y#Ua)]#Uas#Uat#Uau#Uav#Uaw#Uax#Uay#Uaz#Ua!l#Ua!x#Ua#T#Ua#V#Ua#p#Ua#v#Ua({#Ua(}#Ua)p#Uab#Uae#Uam#Ua|#Ua!O#Ua!o#Ua!r#Ua!s#Ua!t#Ua!u#Ua!v#Ua!{#Ua#a#Ua#b#Ua#i#Ua#t#Ua${#Ua%c#Ua%e#Ua%k#Ua%l#Ua%o#Ua%v#Ua&m#Ua&r#Ua&s#Ua(w#Ua)V#Ua)_#Ua[#Ua!h#UaQ#Ua!d#Ua~O!x!cO]#Rq!T#Rq!V#Rq#v#Rq({#Rq)p#Rq[#Rq!h#Rq)_#RqQ#Rq!d#Rq~O!W6[O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W6[O~P!(}O!h2TOQ)Pa!d)Pa~O)_6aO~Om-jO!TxO)p6bO~O]*{O!T$YO!V&dO!h*yO)_)wX~O)p6fO~P)+|O[6hO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[6hO~O$c6jOP$_q]$_qb$_qe$_qm$_qs$_qt$_qu$_qv$_qw$_qx$_qy$_qz$_q|$_q!O$_q!T$_q!V$_q!X$_q!Y$_q!i$_q!o$_q!r$_q!s$_q!t$_q!u$_q!v$_q!x$_q!{$_q#V$_q#a$_q#b$_q#i$_q#p$_q#t$_q#v$_q$R$_q$T$_q$Y$_q$Z$_q$`$_q$e$_q$g$_q$h$_q$k$_q$m$_q$o$_q$q$_q$s$_q$u$_q$w$_q${$_q$}$_q%U$_q%_$_q%`$_q%a$_q%c$_q%e$_q%g$_q%l$_q%o$_q%v$_q%|$_q&m$_q&r$_q&s$_q'Q$_q'R$_q'V$_q'Y$_q'a$_q'b$_q(l$_q(u$_q(w$_q)V$_q)Y$_q)[$_q)]$_q)_$_q)`$_q)b$_q)n$_q)o$_q!U$_q~O)_6kO~OPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)_6mO)`!ZO)bXO)ncO)odO~P&@^O({6oO)p*wO~P)+|O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_6mO)`$OO~P#4YO[6qO~P!(}O)_6uO~O)_6vO~O]-_Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO(w-ZO)Y-[O~O]&eO!V2|O!h%Oa)_%Oa[%Oa~O!W6|O)Y6}O~P$&OO!h2}O)_){a~O[7QO]&eO!V2|O~O!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xq!o$Xq!{$Xq#i$Xq#p$Xq#t$Xq#v$Xq$R$Xq$T$Xq$Y$Xq$Z$Xq${$Xq%U$Xq%c$Xq%g$Xq%o$Xq%|$Xq(l$Xq)[$Xq!U$Xq$c$Xq~P$0yOPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)VYO)Y$mO)]$mO)_7SO)`!ZO)bXO)ncO)odO~P&@^O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_7VO)`$OO~P#4YO)_7WO~OP7XO(uQO~Om*aO)_)dX~P$G`Oq&hOm)SX)_)dX~P$G`O)_7ZO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_&Sa~P#4YO!U7]O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO)_7^O~OPmO]$gOb!]Om;TO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;]O)VYO)Y$mO)]$mO)`0uO)bXO)ncO)odO[)jP~P&@^O!h3wO)`7bO!T)ea~O!h3wO!T)ea~O)_7gO)p7iO~P('OO)_7kO~PGYO]4ROm)QOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO!|%TO%v$oO&r#WO(w)PO)Y4OO)[4SO)]4SO~O)Y7oO~O]&eO!T*vO!V7qO!h7rO#v!eO({4VO~O)_7gO)p7tO~P)GbO]4ROm)QO!{!dO%v$oO&r#WO(w)PO)Y4OO)[4SO)]4SO~Oq&hO])iX!T)iX!V)iX!h)iX#v)iX({)iX)_)iX)p)iX[)iX~O)_7gO~O!T(SO!l7zO({(RO])Tie)Tim)Tis)Tit)Tiu)Tiv)Tiw)Tix)Tiy)Tiz)Ti!O)Ti!V)Ti!r)Ti!s)Ti!t)Ti!u)Ti!v)Ti!x)Ti!{)Ti%v)Ti&r)Ti&s)Ti(w)Ti)Y)Ti)[)Ti)])Ti)_)Ti[)Ti!X)Ti!Y)Ti![)Ti!^)Ti!_)Ti!a)Ti!b)Ti!e)Ti!f)Ti!h)Ti(z)Ti(|)Ti(})Ti)Z)Ti)^)Ti)`)Ti!g)Ti)p)Ti!W)TiQ)Ti!d)Ti!U)Ti#v)Ti~O(w%pO!U(gX!h(gX~O!h4`O!U*Wa~Oq&hO]*Vae*Vam*Vas*Vat*Vau*Vav*Vaw*Vax*Vay*Vaz*Va!O*Va!T*Va!V*Va!r*Va!s*Va!t*Va!u*Va!v*Va!x*Va!{*Va%v*Va&r*Va&s*Va(w*Va)Y*Va)[*Va)]*Va)_*Va[*Va!X*Va!Y*Va![*Va!^*Va!_*Va!a*Va!b*Va!e*Va!f*Va!h*Va(z*Va(|*Va(}*Va)Z*Va)^*Va)`*Va!g*Va)p*Va!W*VaQ*Va!d*Va({*Va!U*Va#v*Va~O!T(]O]&kqe&kqm&kqs&kqt&kqu&kqv&kqw&kqx&kqy&kqz&kq!O&kq!V&kq!r&kq!s&kq!t&kq!u&kq!v&kq!x&kq!{&kq%v&kq&r&kq&s&kq(w&kq)Y&kq)[&kq)]&kq)_&kq[&kq!X&kq!Y&kq![&kq!^&kq!_&kq!a&kq!b&kq!e&kq!f&kq!h&kq(z&kq(|&kq(}&kq)Z&kq)^&kq)`&kq!g&kq)p&kq!W&kqQ&kq!d&kq({&kq!U&kq#v&kq~OPmOb%SOm;RO!T$YO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)bXO)ncO)odO~O]*[i!V*[i!X*[i!Y*[i![*[i!^*[i!_*[i!a*[i!b*[i!e*[i!f*[i!h*[i(z*[i(|*[i(}*[i)Y*[i)Z*[i)[*[i)]*[i)^*[i)_*[i)`*[i!g*[i)p*[i[*[i!W*[i({*[i!U*[iQ*[i!d*[i~P*&qO[8PO~O!W8QO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^q)_'^q!g'^q)p'^q['^q!W'^q({'^q!U'^qQ'^q!d'^q~P#4YO!h8RO[*`X~O[8TO~O*^8UO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h_y)__y!g_y)p_y[_y!W_y({_y!U_yQ_y!d_y~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[(ia!h(ia~P#4YO]$PO!T$YO!V'Zy!X'Zy!Y'Zy!['Zy!^'Zy!_'Zy!a'Zy!b'Zy!e'Zy!f'Zy!h'Zy(z'Zy(|'Zy(}'Zy)Y'Zy)Z'Zy)['Zy)]'Zy)^'Zy)_'Zy)`'Zy!g'Zy)p'Zy['Zy!W'Zy({'Zy!U'ZyQ'Zy!d'Zy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^y)_'^y!g'^y)p'^y['^y!W'^y({'^y!U'^yQ'^y!d'^y~P#4YO]&eO!V+pO!T%uy#v%uy)_%uy)p%uy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U(Va!h(Va~P#4YO!W5PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U#}i!h#}i~P#4YO!U8WO~P&7dO!W8WO~P&7dO[8WO~P&7dO[8YO~P&7dO]&eO!V&dO[#Qy!T#Qy!h#Qy#v#Qy)_#Qy)p#QyQ#Qy!d#Qy({#Qy~O]&eO!V+pO[rqQrq!drq!hrq)`rq)_rq~O]&eOQ#Pi!d#Pi!h#Pi[#Pi~O!V+pO~P*:TOQ#nX!d#nX!h#nX[#nX~P(ETO!V&dO~P*:TOQ(PX](PXe'rXm'rXs(PXt(PXu(PXv(PXw(PXx(PXy(PXz(PX!V(PX!d(PX!h(PX!{'rX%v'rX(w'rX)Y(PX)[(PX)](PX[(PX~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ#_i!d#_i!h#_i[#_i~P#4YO&r#WO&s$yOQ#fi!d#fi!h#fi~O(w-ZO)`1aO)p1`OQ#`X!d#`X!h#`X~O!W8_O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W8_O~P!(}O!T#qi!x#qi#v#qi({#qi)p#qi[#qi!h#qi)_#qiQ#qi!d#qi)`#qi~O]&eO!V+pO~P*@PO]&[O!V&YO&r#WO&s$yO)Y&XO)[&]O)]&]O~P*@PO[8aO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!h8bO[)uX~O[8dO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ*ZX!d*ZX!h*ZX~P#4YO)`8gOQ*YX!d*YX!h*YX~O)_8iO~O[$bi!h#{a)_#{a~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_8lO)`$OO~P#4YO[8nO~P!(}O[8nO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[8nO~O]&eO!V&dO({8tO~O)_8uO~O]&eO!V2|O!h%Oi)_%Oi[%Oi~O!W8xO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W8xO)Y8zO~P$&OO!W8xO~P!(}O]&eO!V2|O!h(Za)_(Za~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_8{O)`$OO~P#4YO)_2pO~P!(}O)_8{O~OP%qO[8|O(uQO~O[8|O~O)_8}O~P%%sO#T9QO(}.UO)_9OO~O!h3wO!T)ei~O)`9UO!T'xa!h'xa~O)_9WO)p9YO~P)GbO)_9WO~O)_9WO)p9^O~P('OOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~P)HQO]&eO!V7qO!T!ya!h!ya#v!ya({!ya)_!ya)p!ya[!ya~O!W9eO)Y9fO~P$&OO!T$YO!h7rO({4VO)_9WO)p9^O~O!T$YO~P#EtO[9iO]&eO!V7qO~O]&eO!V7qO!T&aa!h&aa#v&aa({&aa)_&aa)p&aa[&aa~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_&ba~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_9WO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U&oi!h&oi~P#4YO!V/SO]']i!T']i!X']i!Y']i![']i!^']i!_']i!a']i!b']i!e']i!f']i!h']i(z']i(|']i(}']i)Y']i)Z']i)[']i)]']i)^']i)_']i)`']i!g']i)p']i[']i!W']i({']i!U']iQ']i!d']i~O(w%pO)`9lO~O!h8RO[*`a~O[9nO~P&7dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U(Va)_#Zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ#_q!d#_q!h#_q[#_q~P#4YO&r#WO&s$yOQ#fq!d#fq!h#fq~O)p5qOQ#`a!d#`a!h#`a~O]&eO!V+pO!T#qq!x#qq#v#qq({#qq)p#qq[#qq!h#qq)_#qqQ#qq!d#qq)`#qq~O!h8bO[)ua~O)[6TO]&Vi!T&Vi!V&Vi)Y&Vi)Z&Vi)]&Vis&Vit&Viu&Viv&Viw&Vix&Viy&Viz&Vi!l&Vi!x&Vi#T&Vi#V&Vi#p&Vi#v&Vi({&Vi(}&Vi)p&Vib&Vie&Vim&Vi|&Vi!O&Vi!o&Vi!r&Vi!s&Vi!t&Vi!u&Vi!v&Vi!{&Vi#a&Vi#b&Vi#i&Vi#t&Vi${&Vi%c&Vi%e&Vi%k&Vi%l&Vi%o&Vi%v&Vi&m&Vi&r&Vi&s&Vi(w&Vi)V&Vi)_&Vi[&Vi!h&ViQ&Vi!d&Vi~O)_9qO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[$bq!h#{i)_#{i~P#4YO[9sO~P!(}O[9sO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[9sO~O]&eO!V&dO({9vO~O[9wO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[9wO~O]&eO!V2|O!h%Oq)_%Oq[%Oq~O!W9{O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W9{O~P!(}O)_6mO~P!(}O)_9|O~O)_9}O~O(}.UO)_9}O~O!h3wO!T)eq~O)`:PO!T'xi!h'xi~O!T$YO!h7rO({4VO)_:QO)p:SO~O)_:QO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:QO)`$OO~P#4YO)_:QO)p:VO~P)GbO]&eO!V7qO!T!yi!h!yi#v!yi({!yi)_!yi)p!yi[!yi~O!W:ZO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W:ZO)Y:]O~P$&OO!W:ZO~P!(}O]&eO!V7qO!T(ea!h(ea({(ea)_(ea)p(ea~O[:_O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:_O~O[:dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:dO~O]&eO!V2|O!h%Oy)_%Oy[%Oy~O)_:eO~O)_:fO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:fO)`$OO~P#4YO!T$YO!h7rO({4VO)_:fO)p:iO~O]&eO!V7qO!T!yq!h!yq#v!yq({!yq)_!yq)p!yq[!yq~O!W:kO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W:kO~P!(}O[:mO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:mO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:oO)`$OO~P#4YO)_:oO~O]&eO!V7qO!T!yy!h!yy#v!yy({!yy)_!yy)p!yy[!yy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:sO)`$OO~P#4YO)_:sO~O]ZXmhXqZXqjX!TjX!VZX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX(zZX({$]X(|ZX(}ZX)YZX)ZZX)[ZX)]ZX)^ZX)_ZX)`ZX)pZX~O]%WXmnXqoXq%WX!ToX!V%WX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!e%WX!f%WX!gnX!h%WX(z%WX(|%WX(}%WX)Y%WX)Z%WX)[%WX)]%WX)^%WX)`%WX)pnX[%WXQ%WX!d%WX~O)_%WX!W%WX({%WX!U%WX~P+H]O]oX]%WXeoXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!VoX!V%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX[oX[%WX!hoX)`oX~O)_oX)poX~P+JmO]%WXmnXqoXq%WX!V%WX!h%WXQ%WX!d%WX[%WX~O!T%WX#v%WX)_%WX)p%WX({%WX~P+MWOQoXQ%WX!ToX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!doX!d%WX!e%WX!f%WX!gnX!h%WX(z%WX(|%WX(}%WX)Y%WX)Z%WX)[%WX)]%WX)^%WX)`%WX)pnX~P+JmO]oX]%WXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!V%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX~O!ToX({oX)_oX)poX~P,!OOeoX!VoX)_%WX~P,!OOmnXqoX)_%WX~Oe)tO%Y)uO)O:vO~Oe)tO%Y)uO)O:{O~Oe)tO%Y)uO)O:wO~Oe$TO%Y*YO'[$VO'_$WO)O:vO~Oe$TO%Y*YO'[$VO'_$WO)O:xO~Oe$TO%Y*YO'[$VO'_$WO)O:zO~O[jX]jXsjXtjXujXvjXwjXxjXyjXzjX!VjX&rjX&sjX)YjX)[jX)]jXejX!OjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX(wjX~P#1xO]ZXmhXqZXqjX!VZX!hZX)_ZX)pZX~O!TZX#vZX({ZX~P,(fOmhXqjX)VjX)_ZX)pjX~O]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VZX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX[ZX[jX!hjX)`jX)pjX~O)_ZX~P,)pO]ZX]jXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!TjX!VZX!VjX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX!hjX&rjX&sjX(zZX(|ZX(}ZX)YZX)YjX)ZZX)[ZX)[jX)]ZX)]jX)^ZX)`ZX)`jX)pZX~OQZXQjX!dZX!djX~P,,ZO]jXejXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX~P#1xO]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VZX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX~O)_jX~P,1]O[ZX[jXejX!OjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX(wjX)pjX~P,,ZO]ZX]jXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!TjX!VZX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX({jX)YjX)[jX)]jX)_jX)pjX~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~PBXOe$TO%Y*YO)O:vO~Oe$TO%Y*YO)O:wO~Oe$TO%Y*YO)O:}O~Oe$TO%Y*YO)O:|O~O]%jOe!POm%dOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V%mO!{!dO!|%TO%v$oO(w$zO)Y;hO)[;iO)];iO~O]%jOe!POm%dO!V%mO!{!dO%v$oO(w$zO)Y;hO)[;iO)];iO~Oe$TO%Y$UO)O:wO~Oe$TO%Y$UO)O:{O~Om;QO~Om;PO~O]dXmhXqjX!TdX~Oe)tO%Y*YO)O:vO~Oe)tO%Y*YO)O:wO~Oe)tO%Y*YO)O:xO~Oe)tO%Y*YO)O:yO~Oe)tO%Y*YO)O:zO~Oe)tO%Y*YO)O:|O~Oe)tO%Y*YO)O:}O~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~P,9iO])SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)p)SX~Om;PO!T)SX({)SX)_)SX~P,=hO]&wXmnXqoX!T&wX~Oe4rO%Y*YO)O;{O~Om;cO)Y<PO)[5hO)]5hO~P(FVOe!POm%dO!{!dO%v$oO(w$zO~O]1ZO!V1XO)Y1RO)[<QO)]<QOQ#nX!d#nX!h#nX[#nX~P,@dO)Y;aO~Om;oO~Om;pO~Om;qO~Om;sO~Om;tO~Om;uO~Om;sO!T$YOQ)SX!d)SX!h)SX)`)SX[)SX)p)SX~P$G`Om;qO!T$YO~P$G`Om;oO!g$[O)p$[O~Om;qO!g$[O)p$[O~Om;sO!g$[O)p$[O~Om;pO[)SX!h)SX)`)SX)p)SX~P$G`Oe/eO%Y*YO)O;{O~Om;|O~O)Y<aO~OV'e'h'i'g(u)b!R(wS(p%Z!Y!['je%[!i'R!f]'f*a'k(|!^!_'l'm'l~",
      goto: "%7u*aPPPPP*b*lP*oPP.ePP4y7z7z;UP;U>`P>y?]?qFiMi!&m!-TP!3}!4r!5gP!6RPPPPPPPP!6lP!8UP!9g!;PP!;VPPPPPP!;YP!;YPP!;YPP!;fPPPPPP!=h!AOP!ARPP!Ao!BdPPPPP!BhP>|!CyPP>|!FQ!HR!Ha!Iv!KgP!KrP!LR!LR# c#$r#&Y#)f#,p!HR#,zPP!HR#-R#-X#,z#,z#-[P#-`#-}#-}#-}#-}!KgP#.h#.y#1`P#1tP#3aP#3e#3m#4b#4m#6{#7T#7T#3eP#3eP#7[#7bP#7lPP#8X#8v#9h#8XP#:Y#:fP#8XP#8XPP#8X#8XP#8XP#8XP#8XP#8XP#8XP#8XP#:i#7l#;VP#;lP#<R#<R#<R#<R#<`#3eP#<v#Ar#BaPPPPPPPP#CXP#CgP#CgP#Cs#GQ#;bPP#Ca#GdP#Gw#HS#HY#HY#Ca#IOP#3e#3e#3e#3e#3eP!LR#Ij#Iq#Iq#Iq#Iu# ]#JP# ]#JT!Ha!Ha!Ha#JW#Np!Ha>|>|>|$%i!Bd!Bd!Bd!Bd!Bd!Bd!6l!6l!6l$%|P$'i$'w!6l$'}PP!6l$*]$*`#CO$*c;U7z$-i$/d$1T$2s7zPP7z$4g7zP7z7zP7zP$7m7zP7zPP7z$7yPPPPPPPPP*lP$;R$;X$;_$=v$?|$@S$@j$@t$AP$A`$Af$Bt$Cs$Cz$DR$DX$Da$Dk$Dq$D|$ES$E]$Ee$Ep$Ev$FQ$FW$Fb$Fi$Fx$GO$GUP$G[$Gd$Gk$Gy$Ig$Im$Is$Iz$JTPPPPPPPPPPPP$JZ$J_PPPPP%#a$*]%#d%&l%(tPP%)R%)UPPPPPPPPPP%)b%*e%*k%*o%,f%-s%.f%.m%0|%1SPPP%1^%1i%1l%1r%2y%2|%3W%3b%3f%4j%5]%5c#CXP%5|%6^%6a%6q%6}%7R%7X%7_$*]$*`$*`%7b%7eP%7o%7rQ#dPZ(s#b(o(p(t/ZR#dP'`mO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mU%qm%r7XQ&o!`Q(o#^d0W*S0T0U0V0Y5U5V5W5Z8XR7X3[b}Oaewx{!g&U*v&v$k[!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|1S1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mS%bf0o#d%lgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aS%sm!YS&w!h#PQ'_!tQ'i!yQ'j!zQ(o#aQ(p#^Q(q#_Q*}%mQ,]&nQ,b&pQ-X'`Q-i'hQ-p'sS.w(]4`Q/m)lQ0l*rQ2X,aQ2`,hQ3V-jQ4i/RQ4m/[Q5m1UQ6c2[Q7U3WQ8h6bQ9l8RR;b1X$|#iS!]${%S%V%]&l&m'S'Z']'c'e(c(g(j(|(})W)X)Y)Z)[)])^)_)`)a)b)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:pQ&r!dQ(i#ZQ(x#cQ)o$V[*x%g*]0r2g2n3SQ,c&qQ/T(hQ/Z(pQ/b(yS/p)n/UQ0y+VS4x/q/rR8V4y'a![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m'a!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ)T#mS+V%{0zQ/y)xk4U.l3z4O4R4S7j7l7m7o7r9`9a:YQ)V#mk4T.l3z4O4R4S7j7l7m7o7r9`9a:Yl)U#m.l3z4O4R4S7j7l7m7o7r9`9a:YT+V%{0z[UOwx!g&U*vW$b[e$g(d#l$r_!f!u!}#R#S#T#U#V#Z$U$V$n%W&W&[&e&o'a(P(R(W(`(i)o)u+a+f+g+y,O,^,p-P-V-t-y.].^.d.e.i.v.z1[1`1m1r1t2s3c3d3e3w3{5q6U6W7c8b![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS;l'v-|U;m(S.r.t&|<Saf{|!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%O%P%U%_%j%o&S&Y&d&{'O'Q'k'l'w'{(b(k)q)w*e*g*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0d0o1Q1S1X1h1i1s1w2R2j2p2q2|4V4Y4_4h5a5h5l5x6f6j6m6n6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m;g<PQ<T1Zd<U&z'R'd,|-b-c-f2m3R3UW<V&h*{2T3pQ<W#O[<X!t'`'h,a2[6bT<d%{0z[VOwx!g&U*vW$c[e$g(dQ$r.z!j$s_!f!u!}#V#Z$U$V$n%W&W&[&e&o'a(i)o)u+a+f+y,^,p-P-V-t.i1[1`1m1r1t2s3{5q8b&^$|af{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kQ't#O|(O#R#S#T#U(P(R(W(`+g,O.].^.d.e.v3c3d3e3w6U6W7cl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS-s'v-|Q3_-yU;z(S.r.tn<S|%O%P%U%j'w*e*g0d1Q2q5h6n;g<P[<X!t'`'h,a2[6bW<Y&h*{2T3pd<Z&z'R'd,|-b-c-f2m3R3UQ<b1ZT<d%{0z!Q!UO[ewx!g$g&U&h&z'R'd(d*v*{,|-b-c-f2T2m3R3U3p!v$v_!f!u!}#O#V#Z$U$V$n%W&W&[&e&o'a'v(S(i)o)u+a+y,^,p-P-V-t-|.i.r.t1Z1[1`1m1r1t2s3{5q8b&^%Raf{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$Q%ngnp|#m$i%O%P%U%f%j%k%y%{&u'`'h'w*_*e*g*y+b,a,q,{-d-u.k.l0d0z1Q1R1V2[2f2q3z4O4R4S5h6b6n7j7l7m7o7r9`9a:Y;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aQ'^!tz(Q#R#S#T#U(P(R(W(`,O.].^.d.e.v3c3d3e3w6U6W7cf-`'b-Y-[-_2w2x2z2}6x6y8wQ1_+fQ1b+gQ2r-OQ3`-yQ4c.zQ5s1aR8^5t!Q!UO[ewx!g$g&U&h&z'R'd(d*v*{,|-b-c-f2T2m3R3U3p!x$v_!f!u!}#O#V#Z$U$V$n%W&W&[&e&o'a'v(S(i)o)u+a+f+y,^,p-P-V-t-|.i.r.t1Z1[1`1m1r1t2s3{5q8b&^%Raf{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$S%ngnp|!t#m$i%O%P%U%f%j%k%y%{&u'`'h'w*_*e*g*y+b,a,q,{-d-u.k.l0d0z1Q1R1V2[2f2q3z4O4R4S5h6b6n7j7l7m7o7r9`9a:Y;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<a|(Q#R#S#T#U(P(R(W(`+g,O.].^.d.e.v3c3d3e3w6U6W7cQ3`-yR4c.z[WOwx!g&U*vW$d[e$g(d#l$r_!f!u!}#R#S#T#U#V#Z$U$V$n%W&W&[&e&o'a(P(R(W(`(i)o)u+a+f+g+y,O,^,p-P-V-t-y.].^.d.e.i.v.z1[1`1m1r1t2s3c3d3e3w3{5q6U6W7c8b![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS;l'v-|U;m(S.r.tn<S|%O%P%U%j'w*e*g0d1Q2q5h6n;g<PQ<T1ZQ<W#O[<X!t'`'h,a2[6b&^<[af{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:md<]&z'R'd,|-b-c-f2m3R3UW<^&h*{2T3pT<d%{0zp$RT$a$q%d%t)Q;R;S;T;c;d;e;f;j;k<co)r$X*Z*a/f;O;P;Q;o;p;q;r;s;t;u;|p$ST$a$q%d%t)Q;R;S;T;c;d;e;f;j;k<co)s$X*Z*a/f;O;P;Q;o;p;q;r;s;t;u;|^&g}!O$k$l%b%l;bd&k!U$v%R%n'^(Q1_1b3`4cV/h)T)U4US%[e$gQ,Y&hQ/Q(dQ2t-VQ6Q1tQ6^2TQ6t2sR9o8b#}!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8b#[^O[_`wx!f!g!}#O$U$f$n$u$w&U&W&[&e&o&t&z'R'd'v(S)u*b*v*{+a,^,p,|-P-b-c-f-t-y-|.i.r.t1Z1[1m2m3R3U3p3{_(W#R#S#T+g3c3d3e#}ZO[wx!g!k#R#S#T%o&U&W&[&e&o&y&z&{'O'Q'R'^'d'v'z(P(R(S(W*v*{+a+g,^,m,p,v-U-b-c-f-t-y-|.P.d.i.r.v1Z1[1m2j2r3R3U3c3d3e3p6j6q8n9s9w:_:d:mQ$_YR0[*TR*V$_e0W*S0T0U0V0Y5U5V5W5Z8X$f#{S%V%]'S'Z']'c'e(j(|(})W)Z)[)])^)_)`)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:pe0W*S0T0U0V0Y5U5V5W5Z8X'`!YO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:me0W*S0T0U0V0Y5U5V5W5Z8XR5[0[^(V#R#S#T+g3c3d3eY.b(P(T(W(X7[U3r.`.c.vS7`3s4^R9j7z^(U#R#S#T+g3c3d3e[.a(P(T(V(W(X7[W3q.`.b.c.vU7_3r3s4^S9R7`7zR:^9jT.p(S.rd]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{Q%vnT1|,S1}!jbOaenpwx{|!g#O%O%P%U%j%y&U'v'w(S*e*g*v-u-|.k.r.t0d1Q1Z2q5h6n;g<Pf-]'b-Y-[-_2w2x2z2}6x6y8wj4P.l3z4O4R4S7j7l7m7o7r9`9a:Yr<Rg$i%f%k&u*_*y,q,{-d2f;_;`;a;v;x;}i<e+b1R1V;h;i;w;y<O<Q<_<`<a!O&`y%Z&X&[&]'m)m*i*k+b+j+}/t0e1Q1R1V1Z1q5h5}<P<Qz&cz%Q%Y%g&f'u*]*d,g-}0b0c0r1T2g2n3S5^5i6s8pS'}#Q.^n+q&Z*l+k+r+u-o/o0f1Y1e4{5_5g5|8`Q2_,f^2{-^2y3P6w7O8v9ze7p4Q7f7n7v7w9]9_9g:X:jS+c&W1[Y+s&[&e*{1Z3pR5z1m#w!POaegnpwx{|!g#O$i%O%P%U%f%j%k%y&U&u'v'w(S*_*e*g*v*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<a`oOwx!g&U'v*v-|#U!Paeg{|#O$i%O%P%U%f%j%k&u'w*_*e*g*y+b,q,{-d0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aU%xnp-uQ+S%yS.j(S.rT3}.k.tW+w&`+q+x1jV,P&c,Q7pQ+}&bU,P&c,Q7pQ-|'vT.X'{.Z'`![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mX1y,O.^6U6W'W!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mW1y,O.^6U6WR2l,x!WjO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mY%Xe$g(d1w3pQ'U!nS)O#k5aQ,r&zQ,}'RS.T'{.ZQ2i,sQ6r2pQ7T3UQ8o6mR9t8l'W![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mX1y,O.^6U6W'ayO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,O,U,W,s,v,|-b-c-f-l.U.V.Z.^/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6U6W6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ&byS'v#O-zR1c+hS+c&W1[R5u1cQ1W+bR5n1VR1W+bT+c&W1[z&^%Z&X&[&]'m)m*i*k+b+j/t0e1Q1R1V1Z1q5h5}<P<QQ&_yR1u+}!P&^y%Z&X&[&]'m)m*i*k+b+j+}/t0e1Q1R1V1Z1q5h5}<P<QQ+z&`S,R&c7pS1k+q+xQ1{,QR5y1j!WkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mS%|o.jS&Qq-wQ&ayQ&s!eQ'g!yQ*u%gU+Q%x%}3}S+U%z&PQ+v&_Q,_&oS,`&p'iQ,w&}S0`*],gS0v+R+SQ0x+TQ1v+}S2Z,b-kQ5]0bQ5b0wQ6S1uQ6a2YQ6d2_Q7u4QQ9Z7fR:W9][uOwx!g&U*vQ,_&oQ-{'vQ3a-yR3f-|xlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mU$j['O-cS%|o.jS&Qq-wQ*u%gU+Q%x%}3}S+U%z&PS0`*],gS0v+R+SQ0x+TQ5]0bQ5b0wQ7u4QQ9Z7fR:W9]T,d&s,e]uOwx!g&U*v[uOwx!g&U*vQ,_&oQ,s&zQ,|'RW-e'd-b-f3RQ-{'vQ3a-yQ3f-|R7S3U[%hg$i,q,{-d2fR0s*y^$ZV!U$c$|%R<Y<ZQ'U!nS)e$P*{S){$Y*vQ*O$[Y*x%g*]0r2n3SQ/T(hS/p)n/US0h*m4hS0q*w6fQ0y+VQ4X.lQ4u/jS4x/q/rS4}/u5aQ5S/|Q6g2gU7h3z4Q4YQ8V4yQ8r6oY9X7f7i7j7s7tQ9y8tW:R9V9Y9]9^Q:b9vU:h:S:U:VR:q:iS){$Y*vT4}/u5aZ)y$Y)z*v/u5aQ&y!hR'z#PS,l&x'xQ2c,jR6e2bxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mV$j['O-c!XkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:m!WhO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mR'Y!q!WkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mR,s&zQ&{!iQ&}!jQ'Q!lR,v&|R,t&zxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mX-e'd-b-f3R[uOwx!g&U*vQ-P'RQ-{'vS.p(S.rR3f-|[uOwx!g&U*vQ-P'RW-e'd-b-f3RT.p(S.rg-`'b-Y-[-_2w2x2z2}6x6y8wylOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mb!OOaewx{!g&U*v&|$l[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m#d%lgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aQ'_!tQ-X'`Q-i'hQ2X,aQ6c2[R8h6bj$TT$a%d%t;R;S;T;c;d;e;f;j;ki)t$X*Z;O;P;Q;o;p;q;r;s;t;uj$TT$a%d%t;R;S;T;c;d;e;f;j;kh)t$X*Z;O;P;Q;o;p;q;r;s;t;uS/e)Q<cV4r/f/g;|[uOwx!g&U*vQ-{'vR3f-|[uOwx!g&U*vT.p(S.r'`!YO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mR7Y3[[uOwx!g&U*vQ-{'vS.p(S.rR3f-|[pOwx!g&U*vQ%ynS-u'v-|T.k(S.rS%}o.jS+R%x3}R0w+SQ+W%{R5d0zS%|o.jS&Qq-wU+Q%x%}3}S+U%z&PS0v+R+SQ0x+TQ5b0wQ7u4QQ9Z7fR:W9]`qOwx!g&U(S*v.rS%zn-uU&Pp.k.tQ+T%yT-w'v-|S'|#Q.^R._'}T.W'{.ZS.X'{.ZQ9P7]R:O9QT6U1x8fR6W1x#d!Pgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<ab!QOaewx{!g&U*v&}![[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m#d!Pgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<ab!QOaewx{!g&U*v&|![[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mk4T.l3z4O4R4S7j7l7m7o7r9`9a:YQ4X.lS7h3z4QU9X7f7j7sS:R9V9]R:h:U#|!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bR4d.zQ(_#US.{(^(`S4e.|.}R8O4fQ.x(]R7|4`#|!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bp$y`$f$u%Z&t'b(a(h)n*i-Y/r1q5r5}8]q)S#m%{.l0z3z4O4R4S7j7l7m7o7r9`9a:YR,Z&hR6_2T'X!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$q#tS%V%]'S'Z']'c'e(c(g(j(|(})W)X)Z)[)])^)_)`)a)b)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$]#uS%V%]'S'Z']'c'e(j(|(})W)[)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$Z#vS%V%]'S'Z']'c'e(j(|(})W)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$c#yS%V%]'S'Z']'c'e(j(|(})W)Z)[)])^)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p'X![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ/U(hQ/q)nQ4y/rR9k8Q']![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ(m#]R/W(mQ#fQR(z#fU%Oa;g<Pb%We$g&h(d-V1t2T2s8bQ'a!u!Q*c%O%W'a*e*k+m,U0d0e1i2w6x6{7l8w9`9d:Y;_;v;w;}<O<_S*e%P%UQ*k%ZS+m&Y1XQ,U&dQ0d*gQ0e*iQ1i+pQ2w-[S6x2x2zQ6{2|Q7l4OQ8w6yS9`7m7oQ9d7qQ:Y9aQ;_%fS;v;`;aS;w<`<aQ;};xQ<O;yT<_1R;h[[Owx!g&U*vl$e['O(P+a,^,m,p-U-c-t.P.d.i.vl'O!k%o&{'Q,v2j6j6q8n9s9w:_:d:m^(P#R#S#T+g3c3d3e`+a&W&[&e*{1Z1[1m3pS,^&o-yQ,m&yU,p&z'R3US-U'^2rW-c'd-b-f3RS-t'v-|Q.P'zQ.d(RS.i(S.rR.v(WQ*R$^R0P*RQ0Y*SQ5U0TQ5V0UQ5W0VY5X0Y5U5V5W8XR8X5ZQ*U$_S0]*U0^R0^*VS.e(R.dS3u.e7cR7c3wQ3x.fS7a3v3yU7e3x7a9SR9S7bQ.r(SR4Z.r!|_O[wx!f!g!}#O$U$n&U&W&[&e&o&z'R'd'v(S)u*v*{+a,^,p,|-P-b-c-f-t-y-|.i.r.t1Z1[1m2m3R3U3p3{U$t_$w*bU$w`$f&tR*b$uU%Pa;g<Pd*f%P*g2x6y7m9a;`;x;y<`Q*g%UQ2x-[Q6y2zQ7m4OQ9a7oQ;`%fQ;x;aQ;y<aT<`1R;hS,Q&c7pR1z,QS*o%]/wR0j*oQ1]+dR5p1]U+j&X1R<PR1d+jQ+x&`Q1j+qT1p+x1jQ8c6QR9p8cQwOS&Tw&UT&Ux*vQ,e&sR2^,eW)z$Y*v/u5aR/{)zU/v)v){0nR5O/v[*z%g%h*]2g2n3SR0t*zQ,i&wR2a,iQ-f'dQ3R-bT3T-f3RQ3O-^R7P3OQ-k'iQ2Y,bT3X-k2YS%rm7XR+P%rdnOwx!g&U'v(S*v-|.rR%wnQ0{+WR5e0{Q.Z'{R3m.ZQ1},SR6X1}U*s%b*};bR0m*sS1n+s0uR5{1nQ7s4QQ9V7fU9h7s9V:UR:U9]$O!SO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t.z1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bR&i!SQ4a.xR7}4aQ2U,ZR6`2US/k)d)eR4v/kW(t#b(o(p/ZR/_(tQ8S4mR9m8ST)f$P*{!USO[wx!g!k%o&U&{'O'Q'd,v-b-c-f2j3R6j6q8n9s9w:_:d:mj${a{$m%_+o,W1h2R5x6}8z9f:]Y%Ve$g(d1w3pY%]f$h(k)q*qQ&l!WQ&m!XQ'S!nQ'Z!rQ']!sQ'c!vQ'e!xQ(c#XQ(g#YS(j#[+_Q(|#hQ(}#kQ)W#nQ)X#sQ)Y#tQ)Z#uQ)[#vQ)]#wQ)^#xQ)_#yQ)`#zQ)a#{Q)b#|Q)c#}S)d$P*{Q)p$WQ)v$YQ)}$[Q+^&SS+l&Y1XQ,T&dQ,X&hQ,o&zQ,z'RQ-m'kQ-n'lS.R'{.ZQ/O(bS/w)w0oS0g*m4hQ0i*nQ0n*vQ0p*wQ1O+]S1g+m+pQ2Q,UQ2h,sS2o,|7SQ3Y-lQ3j.UQ3k.VQ4j/SQ4k/VQ4q/cQ4t/jQ4z/sQ4|/uQ5Q/zQ5R/|Q5k1SQ5w1iQ6O1sQ6]2TS6l2m8{Q6p2pQ6z2|Q7R3UQ7x4VQ7y4YQ7{4_Q8Z5aQ8[5lQ8j6fQ8m6mQ8q6oQ8y6{S9[7i7tQ9c7qQ9r8lQ9x8tS:T9Y9^Q:[9dQ:a9vS:g:S:VR:p:iR,[&hd]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{#r$}ae!u$g%O%P%U%W%Z%f&Y&d&h'a(d*e*g*i*k+m+p,U-V-[0d0e1X1i1t2T2s2w2x2z2|4O6x6y6{7l7m7o7q8b8w9`9a9d:Y;_;`;a;g;h;v;w;x;y;}<O<_<`<aQ%vnS+i&X+jW+w&`+q+x1jU,P&c,Q7pQ1r+yT5j1R<P``Owx!g&U'v*v-|S$f[-tQ$u_b%Ze$g&h(d-V1t2T2s8b!h&t!f!}#O$U$n&W&[&e&o&z'R'd(S)u*{+a,^,p,|-P-b-c-f-y.i.r.t1Z1[1m2m3R3U3p3{Q'b!uS(a#V+fQ(h#ZS)n$V(iQ*i%WQ-Y'aQ/r)oQ1q+yQ5r1`Q5}1rR8]5qS(Y#R3dS(Z#S3eV([#T+g3cR$`Ye0X*S0T0U0V0Y5U5V5W5Z8XW(T#R#S#T+gQ(^#US.`(P(WS.f(R.dQ.}(`W1y,O.^6U6WQ3b-yQ3o.]Q3v.eQ4^.vU7[3c3d3eQ7d3wR9T7cQ.g(RR3t.dT.q(S.rdgOwx!g&U&o'v*v-y-|U$i[,^-tQ&u!fQ'm!}Q'w#OQ)m$UQ*_$n`+b&W&[&e*{1Z1[1m3pQ,q&zQ,{'RY-d'd-b-f3R3US.l(S.rQ/t)uQ1Q+aS2f,p-cS2q,|-PS3z.i.tQ6n2mR7j3{d]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{R%vnQ4Q.lQ7f3zQ7n4OQ7v4RQ7w4SQ9]7jU9_7l7m7oQ9g7rS:X9`9aR:j:YZ+t&[&e*{1Z3ppzOnpwx!g%y&U'v(S*v-u-|.k.r.t[%Qa%f1R;g;h<PU%Ye%j1ZQ%gg^&f{|%k1V5h;i<QQ'u#OQ*]$ib*d%O%P%U;_;`;a<_<`<aQ,g&uQ-}'wQ0b*_[0c*e*g;v;w;x;yQ0r*yQ1T+bQ2g,qQ2n,{S3S-d2fU5^0d;}<OQ5i1QQ6s2qR8p6nQ,S&cR9b7pS1x,O.^Q8e6UR8f6W[%`f$h(k)q)w0oR0k*qR+e&WQ+d&WR5o1[S&Zy+}Q*l%ZU+k&X1R<PS+r&[1ZW+u&]1V5h<QQ-o'mQ/o)mS0f*i*kQ1Y+bQ1e+jQ4{/tQ5_0eQ5g1QQ5|1qR8`5}R6R1tYvOwx&U*vR&v!gW%ig,q,{-dT*^$i2fT)|$Y*v[uOwx!g&U*vQ'P!kQ+O%oQ,u&{Q,y'QQ2k,vQ6i2jQ8k6jQ8s6qQ9u8nQ:`9sQ:c9wQ:l:_Q:n:dR:r:mxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mU$j['O-cX-e'd-b-f3RQ-a'bR2v-YS-^'b-YQ2y-[Q3P-_U6w2w2x2zQ7O2}S8v6x6yR9z8w[rOwx!g&U*vS-v'v-|T.m(S.rR+X%{[sOwx!g&U*vS-x'v-|T.n(S.r[tOwx!g&U*vT.o(S.rT.Y'{.ZX%cf%m0o1XQ.|(^R4f.}R.y(]R(f#XQ(w#bS/Y(o(pR4l/ZR/^(qR4n/[",
      nodeNames: "\u26A0 RawString > MacroName LineComment BlockComment PreprocDirective #include String EscapeSequence SystemLibString Identifier ) ( ArgumentList ConditionalExpression AssignmentExpression CallExpression PrimitiveType FieldExpression FieldIdentifier DestructorName TemplateMethod ScopedFieldIdentifier NamespaceIdentifier TemplateType TypeIdentifier ScopedTypeIdentifier ScopedNamespaceIdentifier :: NamespaceIdentifier TypeIdentifier TemplateArgumentList < TypeDescriptor const volatile restrict _Atomic mutable constexpr constinit consteval StructSpecifier struct MsDeclspecModifier __declspec Attribute AttributeName Identifier AttributeArgs { } [ ] UpdateOp ArithOp ArithOp ArithOp LogicOp BitOp BitOp BitOp CompareOp CompareOp CompareOp > CompareOp BitOp UpdateOp , Number CharLiteral AttributeArgs VirtualSpecifier BaseClassClause Access virtual FieldDeclarationList FieldDeclaration extern static register inline thread_local AttributeSpecifier __attribute__ PointerDeclarator MsBasedModifier __based MsPointerModifier FunctionDeclarator ParameterList ParameterDeclaration PointerDeclarator FunctionDeclarator Noexcept noexcept RequiresClause requires True False ParenthesizedExpression CommaExpression LambdaExpression LambdaCaptureSpecifier TemplateParameterList OptionalParameterDeclaration TypeParameterDeclaration typename class VariadicParameterDeclaration VariadicDeclarator ReferenceDeclarator OptionalTypeParameterDeclaration VariadicTypeParameterDeclaration TemplateTemplateParameterDeclaration template AbstractFunctionDeclarator AbstractPointerDeclarator AbstractArrayDeclarator AbstractParenthesizedDeclarator AbstractReferenceDeclarator ThrowSpecifier throw TrailingReturnType CompoundStatement FunctionDefinition MsCallModifier TryStatement try CatchClause catch LinkageSpecification Declaration InitDeclarator InitializerList InitializerPair SubscriptDesignator FieldDesignator ExportDeclaration export ImportDeclaration import ModuleName PartitionName HeaderName CaseStatement case default LabeledStatement StatementIdentifier ExpressionStatement IfStatement if ConditionClause Declaration else SwitchStatement switch DoStatement do while WhileStatement ForStatement for ReturnStatement return BreakStatement break ContinueStatement continue GotoStatement goto CoReturnStatement co_return CoYieldStatement co_yield AttributeStatement ForRangeLoop AliasDeclaration using TypeDefinition typedef PointerDeclarator FunctionDeclarator ArrayDeclarator ParenthesizedDeclarator ThrowStatement NamespaceDefinition namespace ScopedIdentifier Identifier OperatorName operator ArithOp BitOp CompareOp LogicOp new delete co_await ConceptDefinition concept UsingDeclaration enum StaticAssertDeclaration static_assert ConcatenatedString TemplateDeclaration FriendDeclaration friend union FunctionDefinition ExplicitFunctionSpecifier explicit FieldInitializerList FieldInitializer DefaultMethodClause DeleteMethodClause FunctionDefinition OperatorCast operator TemplateInstantiation FunctionDefinition FunctionDefinition Declaration ModuleDeclaration module RequiresExpression RequirementList SimpleRequirement TypeRequirement CompoundRequirement ReturnTypeRequirement ConstraintConjuction LogicOp ConstraintDisjunction LogicOp ArrayDeclarator ParenthesizedDeclarator ReferenceDeclarator TemplateFunction OperatorName StructuredBindingDeclarator ArrayDeclarator ParenthesizedDeclarator ReferenceDeclarator BitfieldClause FunctionDefinition FunctionDefinition Declaration FunctionDefinition Declaration AccessSpecifier UnionSpecifier ClassSpecifier EnumSpecifier SizedTypeSpecifier TypeSize EnumeratorList Enumerator DependentType Decltype decltype auto PlaceholderTypeSpecifier ParameterPackExpansion ParameterPackExpansion FieldIdentifier PointerExpression SubscriptExpression BinaryExpression ArithOp LogicOp LogicOp BitOp UnaryExpression LogicOp BitOp UpdateExpression CastExpression SizeofExpression sizeof CoAwaitExpression CompoundLiteralExpression NULL NewExpression new NewDeclarator DeleteExpression delete ParameterPackExpansion nullptr this UserDefinedLiteral ParamPack #define PreprocArg #if #ifdef #ifndef #else #endif #elif PreprocDirectiveName Macro Program",
      maxTerm: 431,
      nodeProps: [
        ["group", -35, 1, 8, 11, 15, 16, 17, 19, 71, 72, 100, 101, 102, 104, 191, 208, 229, 242, 243, 270, 271, 272, 277, 280, 281, 282, 284, 285, 286, 287, 290, 292, 293, 294, 295, 296, "Expression", -13, 18, 25, 26, 27, 43, 255, 256, 257, 258, 262, 263, 265, 266, "Type", -19, 126, 129, 147, 150, 152, 153, 158, 160, 163, 164, 166, 168, 170, 172, 174, 176, 178, 179, 188, "Statement"],
        ["isolate", -3, 4, 8, 10, ""],
        ["openedBy", 12, "(", 52, "{", 54, "["],
        ["closedBy", 13, ")", 51, "}", 53, "]"]
      ],
      propSources: [cppHighlighting],
      skippedNodes: [0, 3, 4, 5, 6, 7, 10, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 348, 349],
      repeatNodeCount: 42,
      tokenData: "%LSMfR!UOX$eXY({YZ.gZ]$e]^+P^p$epq({qr.}rs0}st2ktu$euv!7dvw!9bwx!;exy!<Yyz!=Tz{!>O{|!?R|}!AV}!O!BQ!O!P!DX!P!Q#+y!Q!R#5[!R![#JY![!]$4w!]!^$6s!^!_$7n!_!`%$h!`!a%%i!a!b%(o!b!c$e!c!n%)j!n!o%+R!o!w%)j!w!x%+R!x!}%)j!}#O%.O#O#P%/w#P#Q%?[#Q#R%AT#R#S%)j#S#T$e#T#i%)j#i#j%BW#j#o%)j#o#p%Cu#p#q%Dp#q#r%Fv#r#s%Gq#s;'S$e;'S;=`(u<%lO$e,j$nY)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e,f%eW)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^,U&SU'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U&kX'f,UOY%}YZ%}Z]%}]^'W^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U']V'f,UOY%}YZ%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U'uP;=`<%l%},f'{P;=`<%l%^,Y(VW(vS'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(O,Y(rP;=`<%l(O,j(xP;=`<%l$eMf)Y`)c`(vS(o<`'f,U*a1pOX$eXY({YZ*[Z]$e]^+P^p$epq({qr$ers%^sw$ewx(Ox#O$e#O#P,^#P;'S$e;'S;=`(u<%lO$e<`*aT(o<`XY*[YZ*[]^*[pq*[#O#P*p<`*sQYZ*[]^*y<`*|PYZ*[Gz+[`)c`(vS(o<`'f,UOX$eXY+PYZ*[Z]$e]^+P^p$epq+Pqr$ers%^sw$ewx(Ox#O$e#O#P,^#P;'S$e;'S;=`(u<%lO$eGf,cX'f,UOY%}YZ-OZ]%}]^-{^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}Gf-V[(o<`'f,UOX%}XY-OYZ*[Z]%}]^-O^p%}pq-Oq#O%}#O#P,^#P;'S%};'S;=`'r<%lO%}Gf.QV'f,UOY%}YZ-OZ#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}MQ.nT*^1p(o<`XY*[YZ*[]^*[pq*[#O#P*pF`/[[%^#t'QQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`0Q!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`0_Y%]#t!a8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eKz1YY)c`(tS(u=j'f,UOY%^Zr%^rs1xsw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^/[2RW*O#t)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^Gz2tf)c`(vS'f,UOX$eXY2kZp$epq2kqr$ers%^sw$ewx(Ox!c$e!c!}4Y!}#O$e#O#P&f#P#T$e#T#W4Y#W#X5m#X#Y>u#Y#]4Y#]#^NZ#^#o4Y#o;'S$e;'S;=`(u<%lO$eGz4eb)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz5xd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y7W#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz7cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z8q#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz8|d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^:[#^#o4Y#o;'S$e;'S;=`(u<%lO$eGz:gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#b4Y#b#c;u#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz<Qd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y=`#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz=mb)c`(vS'e<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz?Qf)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#`4Y#`#a@f#a#b4Y#b#cHV#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz@qf)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^BV#^#g4Y#g#hEV#h#o4Y#o;'S$e;'S;=`(u<%lO$eGzBbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#ZCp#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGzC}b)c`(vS'f,U'l<`'m<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzEbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#YFp#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGzF}b)c`(vS'j<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzHbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#XIp#X#o4Y#o;'S$e;'S;=`(u<%lO$eGzI{d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^KZ#^#o4Y#o;'S$e;'S;=`(u<%lO$eGzKfd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#ZLt#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGzMRb)c`(vS'f,U'k<`'m<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzNff)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z! z#Z#b4Y#b#c!.[#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz!!Xf)c`(vS'g<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!#m#X#b4Y#b#c!(W#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz!#xd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!%W#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!%cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z!&q#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz!'Ob)c`(vS'h<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz!(cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!)q#X#o4Y#o;'S$e;'S;=`(u<%lO$eGz!)|d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!+[#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!+gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z!,u#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz!-Sb)c`(vS'i<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz!.gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#V4Y#V#W!/u#W#o4Y#o;'S$e;'S;=`(u<%lO$eGz!0Qd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#`4Y#`#a!1`#a#o4Y#o;'S$e;'S;=`(u<%lO$eGz!1kd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#i4Y#i#j!2y#j#o4Y#o;'S$e;'S;=`(u<%lO$eGz!3Ud)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!4d#X#o4Y#o;'S$e;'S;=`(u<%lO$eGz!4od)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!5}#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!6[b)c`(vSV<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eF`!7q[)c`(vS%Z#t![8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!8rY!g:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!9o])]8O)c`(vS%[#t'f,UOY$eZr$ers%^sv$evw!:hwx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!:uY)[8O%^#t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCb!;pW)aW(vS)b8O'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OLS!<eY)c`(vS]Kn'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e-^!=`Y[r)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!>][)Y8O)c`(vS%Z#t'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!?`^)c`(vS%Z#t!Y8O'f,UOY$eZr$ers%^sw$ewx(Ox{$e{|!@[|!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!@gY)c`!X:t(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!AbY!h8W)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!B__)c`(vS%Z#t!Y8O'f,UOY$eZr$ers%^sw$ewx(Ox}$e}!O!@[!O!_$e!_!`!8g!`!a!C^!a#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!CiY(}:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!Dd^)c`(vS'f,U(|8OOY$eZr$ers%^sw$ewx(Ox!O$e!O!P!E`!P!Q$e!Q![!GY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!Ei[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P!F_!P#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!FjY)`8W)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj!Gen)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx!Icx!Q$e!Q![!GY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCY!IjY(vS'f,UOY(OZr(Ors%}s!Q(O!Q![!JY![#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OCY!Jcn(vS!i8O'f,UOY(OZr(Ors%}sw(Owx!Icx!Q(O!Q![!JY![!g(O!g!h!La!h!i##`!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#X(O#X#Y!La#Y#Z##`#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY!Ljl(vS!i8O'f,UOY(OZr(Ors%}s{(O{|!Nb|}(O}!O!Nb!O!Q(O!Q![# e![!c(O!c!h# e!h!i# e!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#Y# e#Y#Z# e#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY!Ni^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![# e![!c(O!c!i# e!i#O(O#O#P&f#P#T(O#T#Z# e#Z;'S(O;'S;=`(o<%lO(OCY# nj(vS!i8O'f,UOY(OZr(Ors%}sw(Owx!Nbx!Q(O!Q![# e![!c(O!c!h# e!h!i# e!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#Y# e#Y#Z# e#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY##id(vS!i8O'f,UOY(OZr(Ors%}s!h(O!h!i##`!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#Y(O#Y#Z##`#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj#%Sn)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox{$e{|#'Q|}$e}!O#'Q!O!Q$e!Q![#(]![!c$e!c!h#(]!h!i#(]!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#Y#(]#Y#Z#(]#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#'Z`)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#(]![!c$e!c!i#(]!i#O$e#O#P&f#P#T$e#T#Z#(]#Z;'S$e;'S;=`(u<%lO$eCj#(hj)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx!Nbx!Q$e!Q![#(]![!c$e!c!h#(]!h!i#(]!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#Y#(]#Y#Z#(]#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#*ef)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox!h$e!h!i#*Y!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#Y$e#Y#Z#*Y#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eMf#,W`)c`(vS%Z#t![8O'f,UOY$eZr$ers%^sw$ewx(Oxz$ez{#-Y{!P$e!P!Q#.T!Q!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf#-eY)c`(vS(pAz'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf#.`Y)c`(vSSAz'f,UOY#.TZr#.Trs#/Osw#.Twx#4]x#O#.T#O#P#0[#P;'S#.T;'S;=`#5U<%lO#.TMb#/XW)c`SAz'f,UOY#/OZw#/Owx#/qx#O#/O#O#P#0[#P;'S#/O;'S;=`#4V<%lO#/OMQ#/xUSAz'f,UOY#/qZ#O#/q#O#P#0[#P;'S#/q;'S;=`#1l<%lO#/qMQ#0cXSAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P;'S#/q;'S;=`#1l<%lO#/qMQ#1VVSAz'f,UOY#/qYZ%}Z#O#/q#O#P#0[#P;'S#/q;'S;=`#1l<%lO#/qMQ#1oP;=`<%l#/qMQ#1y]SAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P#b#/q#b#c#/q#c#f#/q#f#g#2r#g;'S#/q;'S;=`#1l<%lO#/qMQ#2yUSAz'f,UOY#/qZ#O#/q#O#P#3]#P;'S#/q;'S;=`#1l<%lO#/qMQ#3dZSAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P#b#/q#b#c#/q#c;'S#/q;'S;=`#1l<%lO#/qMb#4YP;=`<%l#/OMU#4fW(vSSAz'f,UOY#4]Zr#4]rs#/qs#O#4]#O#P#0[#P;'S#4];'S;=`#5O<%lO#4]MU#5RP;=`<%l#4]Mf#5XP;=`<%l#.TCj#5gt)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#U$e#U#V#Li#V#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$0p#m;'S$e;'S;=`(u<%lO$eCY#8OY(vS'f,UOY(OZr(Ors%}s!Q(O!Q![#8n![#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OCY#8wp(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#7wx!O(O!O!P#:{!P!Q(O!Q![#8n![!g(O!g!h!La!h!i##`!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#X(O#X#Y!La#Y#Z##`#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#;Un(vS!i8O'f,UOY(OZr(Ors%}s!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#=]p(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#?ax!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#?h^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![#=S![!c(O!c!i#=S!i#O(O#O#P&f#P#T(O#T#Z#=S#Z;'S(O;'S;=`(o<%lO(OCY#@mt(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#?ax{(O{|!Nb|}(O}!O!Nb!O!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj#CYp)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Eip)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#?ax!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Gxt)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#?ax{$e{|#'Q|}$e}!O#'Q!O!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Jep)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Lr_)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P#Mq!P!Q$e!Q!R#Np!R![#JY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj#Mz[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![!GY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj#N{t)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#U$e#U#V$#]#V#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$$[#m;'S$e;'S;=`(u<%lO$eCj$#f[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#JY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj$$e`)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![$%g![!c$e!c!i$%g!i#O$e#O#P&f#P#T$e#T#Z$%g#Z;'S$e;'S;=`(u<%lO$eCj$%rr)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x!O$e!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCY$(T^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![$)P![!c(O!c!i$)P!i#O(O#O#P&f#P#T(O#T#Z$)P#Z;'S(O;'S;=`(o<%lO(OCY$)Yr(vS!i8O'f,UOY(OZr(Ors%}sw(Owx$'|x!O(O!O!P#:{!P!Q(O!Q![$)P![!c(O!c!g$)P!g!h$+d!h!i$)P!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X$)P#X#Y$+d#Y#Z$)P#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY$+mu(vS!i8O'f,UOY(OZr(Ors%}sw(Owx$'|x{(O{|!Nb|}(O}!O!Nb!O!P#:{!P!Q(O!Q![$)P![!c(O!c!g$)P!g!h$+d!h!i$)P!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X$)P#X#Y$+d#Y#Z$)P#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj$.]u)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x{$e{|#'Q|}$e}!O#'Q!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj$0yc)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P#Mq!P!Q$e!Q!R$2U!R![$%g![!c$e!c!i$%g!i#O$e#O#P&f#P#T$e#T#Z$%g#Z;'S$e;'S;=`(u<%lO$eCj$2av)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x!O$e!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#U$%g#U#V$%g#V#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$$[#m;'S$e;'S;=`(u<%lO$eGz$5S[({9b)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox![$e![!]$5x!]#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eFh$6TYm:|)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj$7OY)_8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eM^$7{_q8O%]#t)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!^$8z!^!_$MX!_!`% f!`!a%#m!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8z3h$9T])c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8z!b$:PTO!`$9|!`!a$:`!a;'S$9|;'S;=`$:e<%lO$9|!b$:eO$W!b!b$:hP;=`<%l$9|3d$:rZ)c`'f,UOY$:kYZ$9|Zw$:kwx$;ex!`$:k!`!a$If!a#O$:k#O#P$<r#P;'S$:k;'S;=`$JZ<%lO$:k3S$;jX'f,UOY$;eYZ$9|Z!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e3S$<`U$W!bY&j'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}3S$<w['f,UOY$;eYZ$;eZ]$;e]^$=m^!`$;e!`!a$A`!a#O$;e#O#P$HO#P;'S$;e;'S;=`$Hv;=`<%l$F[<%lO$;e3S$=rX'f,UOY$;eYZ$>_Z!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e-h$>dX'f,UOY$>_YZ$9|Z!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$?WU$W!b'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}-h$?oZ'f,UOY$>_YZ$>_Z]$>_]^$@b^!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$@gX'f,UOY$>_YZ$>_Z!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$AVP;=`<%l$>_3S$A]P;=`<%l$;e3S$AgW$W!b'f,UOY$BPZ!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$BUW'f,UOY$BPZ!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$BuUY&j'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}1p$C^Y'f,UOY$BPYZ$BPZ]$BP]^$C|^#O$BP#O#P$Dt#P;'S$BP;'S;=`$El;=`<%l$F[<%lO$BP1p$DRX'f,UOY$BPYZ%}Z!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$DqP;=`<%l$BP1p$DyZ'f,UOY$BPYZ%}Z]$BP]^$C|^!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$EoXOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$BP<%lO$F[&j$F_WOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx<%lO$F[&j$F|OY&j&j$GPRO;'S$F[;'S;=`$GY;=`O$F[&j$G]XOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$F[<%lO$F[&j$G{P;=`<%l$F[3S$HTZ'f,UOY$;eYZ$>_Z]$;e]^$=m^!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e3S$HyXOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$;e<%lO$F[3d$IqW$W!bY&j)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^3d$J^P;=`<%l$:k3W$JhZ(vS'f,UOY$JaYZ$9|Zr$Jars$;es!`$Ja!`!a$KZ!a#O$Ja#O#P$<r#P;'S$Ja;'S;=`$LO<%lO$Ja3W$KfW$W!bY&j(vS'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(O3W$LRP;=`<%l$Ja3h$LcY$W!bY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e3h$MUP;=`<%l$8zM^$Mf^)c`(vS%[#t!f8O'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!_$8z!_!`$Nb!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^$Nm]!g:t)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^% s]%]#t!b8O)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a%!l!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^%!}Y%]#t!b8O$W!bY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e2U%#xYY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%$s[)p#v)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`0Q!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%%v]%]#t)c`(vS!d8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`%&o!`!a%'l!a#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%&|Y%]#t!b8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%'y[)c`(vS%[#t!f8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e,l%(zY(zQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf%)yb)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eMf%+bb)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%,jsw$ewx%-]x!Q$e!Q![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eIQ%,sW)c`(u=j'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^CY%-fW(vS)b8O'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OF`%.ZZ!V:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!}$e!}#O%.|#O#P&f#P;'S$e;'S;=`(u<%lO$e,l%/XY)VQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eGz%/|a'f,UOY%1RYZ%1lZ]%1R]^%2k^!Q%1R!Q![%3X![!w%1R!w!x%4i!x#O%1R#O#P%;o#P#i%1R#i#j%8T#j#l%1R#l#m%<c#m;'S%1R;'S;=`%?U<%lO%1R,j%1YUXd'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}Gz%1u[Xd(o<`'f,UOX%}XY-OYZ*[Z]%}]^-O^p%}pq-Oq#O%}#O#P,^#P;'S%};'S;=`'r<%lO%}Gz%2rVXd'f,UOY%}YZ-OZ#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%3`WXd'f,UOY%}Z!Q%}!Q![%3x![#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%4PWXd'f,UOY%}Z!Q%}!Q![%1R![#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%4n['f,UOY%}Z!Q%}!Q![%5d![!c%}!c!i%5d!i#O%}#O#P&f#P#T%}#T#Z%5d#Z;'S%};'S;=`'r<%lO%},j%5i['f,UOY%}Z!Q%}!Q![%6_![!c%}!c!i%6_!i#O%}#O#P&f#P#T%}#T#Z%6_#Z;'S%};'S;=`'r<%lO%},j%6d['f,UOY%}Z!Q%}!Q![%7Y![!c%}!c!i%7Y!i#O%}#O#P&f#P#T%}#T#Z%7Y#Z;'S%};'S;=`'r<%lO%},j%7_['f,UOY%}Z!Q%}!Q![%8T![!c%}!c!i%8T!i#O%}#O#P&f#P#T%}#T#Z%8T#Z;'S%};'S;=`'r<%lO%},j%8Y['f,UOY%}Z!Q%}!Q![%9O![!c%}!c!i%9O!i#O%}#O#P&f#P#T%}#T#Z%9O#Z;'S%};'S;=`'r<%lO%},j%9T['f,UOY%}Z!Q%}!Q![%9y![!c%}!c!i%9y!i#O%}#O#P&f#P#T%}#T#Z%9y#Z;'S%};'S;=`'r<%lO%},j%:O['f,UOY%}Z!Q%}!Q![%:t![!c%}!c!i%:t!i#O%}#O#P&f#P#T%}#T#Z%:t#Z;'S%};'S;=`'r<%lO%},j%:y['f,UOY%}Z!Q%}!Q![%1R![!c%}!c!i%1R!i#O%}#O#P&f#P#T%}#T#Z%1R#Z;'S%};'S;=`'r<%lO%},j%;vXXd'f,UOY%}YZ%}Z]%}]^'W^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%<h['f,UOY%}Z!Q%}!Q![%=^![!c%}!c!i%=^!i#O%}#O#P&f#P#T%}#T#Z%=^#Z;'S%};'S;=`'r<%lO%},j%=c['f,UOY%}Z!Q%}!Q![%>X![!c%}!c!i%>X!i#O%}#O#P&f#P#T%}#T#Z%>X#Z;'S%};'S;=`'r<%lO%},j%>`[Xd'f,UOY%}Z!Q%}!Q![%>X![!c%}!c!i%>X!i#O%}#O#P&f#P#T%}#T#Z%>X#Z;'S%};'S;=`'r<%lO%},j%?XP;=`<%l%1RCr%?gZ!W7^)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P#Q%@Y#Q;'S$e;'S;=`(u<%lO$e-d%@eY)Ux)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%Ab[)c`(vS%[#t'f,U!_8OOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf%Bgd)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%,jsw$ewx%-]x!Q$e!Q!Y%)j!Y!Z%+R!Z![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eCj%DQY!T8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%D}^)c`(vS%[#t'f,U!^8OOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P#p$e#p#q%Ey#q;'S$e;'S;=`(u<%lO$eF`%FWY)Z8O%^#t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e-^%GRY!Ur)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e/j%HOc)c`(vS%[#t'RQ'f,UOX$eXY%IZZp$epq%IZqr$ers%^sw$ewx(Ox!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e,t%Idc)c`(vS'f,UOX$eXY%IZZp$epq%IZqr$ers%^sw$ewx(Ox!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e,t%Jzb)c`(vSeY'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![%Jo![!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e",
      tokenizers: [rawString, fallback, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, new LocalTokenGroup("j~RQYZXz{^~^O(r~~aP!P!Qd~iO(s~~", 25, 355)],
      topRules: { "Program": [0, 307] },
      dynamicPrecedences: { "17": 1, "65": 1, "87": 1, "94": 1, "119": 1, "184": 1, "187": -10, "240": -10, "241": 1, "244": -1, "246": -10, "247": 1, "262": -1, "267": 2, "268": 2, "306": -10, "370": 3, "423": 1, "424": 3, "425": 1, "426": 1 },
      specialized: [{ term: 361, get: (value) => spec_identifier[value] || -1 }, { term: 33, get: (value) => spec_[value] || -1 }, { term: 66, get: (value) => spec_templateArgsEnd[value] || -1 }, { term: 368, get: (value) => spec_scopedIdentifier[value] || -1 }],
      tokenPrec: 24916
    });
  }
});

// src/codegen/shared-types.ts
var shared_types_exports = {};
__export(shared_types_exports, {
  bannedTypes: () => bannedTypes,
  sharedTypes: () => sharedTypes,
  typeDeclarations: () => typeDeclarations
});
var typeDeclarations, sharedTypes, bannedTypes;
var init_shared_types = __esm({
  "src/codegen/shared-types.ts"() {
    "use strict";
    typeDeclarations = `// generated by cppbind.ts from functions marked with [[ZIG_EXPORT(mode)]]

const bun = @import("bun");
const jsc = bun.jsc;
const HTTPServerAgent = bun.jsc.Debugger.HTTPServerAgent;
const Environment = bun.Environment;
`;
    sharedTypes = {
      // Basic types
      "bool": "bool",
      "char": "u8",
      "unsigned char": "u8",
      "signed char": "i8",
      "char16_t": "u16",
      "short": "c_short",
      "unsigned short": "c_ushort",
      "int": "c_int",
      "unsigned": "c_uint",
      "unsigned int": "c_uint",
      "long": "c_long",
      "unsigned long": "c_ulong",
      "long long": "c_longlong",
      "unsigned long long": "c_ulonglong",
      "float": "f32",
      "double": "f64",
      "size_t": "usize",
      "ssize_t": "isize",
      "int8_t": "i8",
      "uint8_t": "u8",
      "int16_t": "i16",
      "uint16_t": "u16",
      "int32_t": "i32",
      "uint32_t": "u32",
      "int64_t": "i64",
      "uint64_t": "u64",
      // Common Bun types
      "BunString": "bun.String",
      "JSC::EncodedJSValue": "jsc.JSValue",
      "EncodedJSValue": "jsc.JSValue",
      "JSC::JSGlobalObject": "jsc.JSGlobalObject",
      "ZigException": "jsc.ZigException",
      "Inspector::InspectorHTTPServerAgent": "HTTPServerAgent.InspectorHTTPServerAgent",
      "HotReloadId": "HTTPServerAgent.HotReloadId",
      "ServerId": "HTTPServerAgent.ServerId",
      "Route": "HTTPServerAgent.Route",
      "Zig::GlobalObject": "jsc.JSGlobalObject",
      "JSC::VM": "jsc.VM",
      "WTF::StringImpl": "bun.WTF._StringImplStruct",
      "WebCore::DOMURL": "bun.DOMURL",
      "ZigString": "bun.jsc.ZigString",
      "JSC::JSPromise": "bun.jsc.JSPromise",
      "JSC::JSMap": "bun.jsc.JSMap",
      "JSC::CustomGetterSetter": "bun.jsc.CustomGetterSetter",
      "JSC::SourceProvider": "bun.jsc.SourceProvider",
      "JSC::CallFrame": "bun.jsc.CallFrame",
      "JSC::JSObject": "bun.jsc.JSObject",
      "JSC::JSString": "bun.jsc.JSString",
      "JSC::Exception": "bun.jsc.Exception",
      "JSC::JSInternalPromise": "bun.jsc.JSInternalPromise",
      "WebCore::EventLoopTask": "bun.jsc.CppTask"
    };
    bannedTypes = {
      "JSC::JSValue": "Not allowed, use JSC::EncodedJSValue instead"
    };
  }
});

// src/codegen/cppbind.ts
import fs from "node:fs";
var start = Date.now();
var isInstalled = false;
try {
  const grammarfile = fs.readFileSync("node_modules/@lezer/cpp/src/cpp.grammar", "utf-8");
  isInstalled = true;
} catch (e) {
}
if (!isInstalled) {
  if (process.argv.includes("--already-installed")) {
    console.error("Lezer C++ grammar is not installed. Please run `bun install` to install it.");
    process.exit(1);
  }
  const r = Bun.spawnSync([process.argv[0], "install", "--frozen-lockfile"], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (r.exitCode !== 0) {
    console.error(r.stdout.toString());
    console.error(r.stderr.toString());
    process.exit(r.exitCode ?? 1);
  }
  const r2 = Bun.spawnSync([...process.argv, "--already-installed"], { stdio: ["inherit", "inherit", "inherit"] });
  process.exit(r2.exitCode ?? 1);
}
var { parser: cppParser } = await Promise.resolve().then(() => (init_dist4(), dist_exports));
var { mkdir } = await import("fs/promises");
var { join, relative } = await import("path");
var { bannedTypes: bannedTypes2, sharedTypes: sharedTypes2, typeDeclarations: typeDeclarations2 } = await Promise.resolve().then(() => (init_shared_types(), shared_types_exports));
var errors = [];
function appendError(position, message) {
  const error = { position, message, notes: [] };
  errors.push(error);
  return error;
}
function appendErrorFromCatch(error, position) {
  if (error instanceof PositionedErrorClass) {
    errors.push(error);
    return error;
  }
  if (error instanceof Error) {
    return appendError(position, error.message);
  }
  return appendError(position, "unknown error: " + JSON.stringify(error));
}
function throwError(position, message) {
  throw new PositionedErrorClass(position, message);
}
var PositionedErrorClass = class extends Error {
  constructor(position, message) {
    super(message);
    this.position = position;
  }
  notes = [];
};
var LineInfo = class {
  constructor(source) {
    this.source = source;
    this.lineStarts = [0];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "\n") {
        this.lineStarts.push(i + 1);
      }
    }
  }
  lineStarts;
  get(offset) {
    let line = 1;
    let lineStart = 0;
    for (let i = this.lineStarts.length - 1; i >= 0; i--) {
      if (this.lineStarts[i] <= offset) {
        line = i + 1;
        lineStart = this.lineStarts[i];
        break;
      }
    }
    const column = offset - lineStart + 1;
    return { line, column };
  }
};
function nodePosition(node, ctx) {
  return {
    file: ctx.file,
    start: ctx.lineInfo.get(node.from),
    end: ctx.lineInfo.get(node.to)
  };
}
var text = (node, ctx) => ctx.sourceCode.slice(node.from, node.to);
function assertNever(value) {
  throw new Error("assertNever");
}
function prettyPrintLezerNode(node, sourceCode) {
  const lines = [];
  const printRecursive = (currentNode, prefix, isLast) => {
    const connector = isLast ? "\u2514\u2500 " : "\u251C\u2500 ";
    const linePrefix = prefix + connector;
    const nodeText = sourceCode.slice(currentNode.from, currentNode.to);
    let truncatedText = nodeText.replace(/\n/g, "\\n");
    if (truncatedText.length > 50) {
      truncatedText = truncatedText.slice(0, 50) + "...";
    }
    lines.push(`${linePrefix}${currentNode.name} [${currentNode.from}..${currentNode.to}] "${truncatedText}"`);
    if (currentNode.name === "CompoundStatement") {
      lines.push(prefix + "    \u2514\u2500 ...");
      return;
    }
    const childPrefix = prefix + (isLast ? "    " : "\u2502   ");
    const children2 = [];
    const cursor2 = currentNode.cursor();
    if (cursor2.firstChild()) {
      do {
        children2.push(cursor2.node);
      } while (cursor2.nextSibling());
    }
    children2.forEach((child, index) => {
      printRecursive(child, childPrefix, index === children2.length - 1);
    });
  };
  const rootText = sourceCode.slice(node.from, node.to).replace(/\n/g, "\\n").slice(0, 50);
  lines.push(`${node.name} [${node.from}..${node.to}] "${rootText}${rootText.length === 50 ? "..." : ""}"`);
  const children = [];
  const cursor = node.cursor();
  if (cursor.firstChild()) {
    do {
      children.push(cursor.node);
    } while (cursor.nextSibling());
  }
  children.forEach((child, index) => {
    printRecursive(child, "", index === children.length - 1);
  });
  return lines.join("\n");
}
function getChildren2(node) {
  const children = [];
  let child = node.firstChild;
  while (child) {
    children.push(child);
    child = child.nextSibling;
  }
  return children;
}
var allowedLezerTypes = /* @__PURE__ */ new Set(["PrimitiveType", "ScopedTypeIdentifier", "TypeIdentifier", "SizedTypeSpecifier"]);
function processRootmostType(ctx, node) {
  const children = getChildren2(node);
  for (const child of children) {
    if (allowedLezerTypes.has(child.type.name)) {
      return { type: "named", name: text(child, ctx), position: nodePosition(child, ctx) };
    }
  }
  throwError(nodePosition(node, ctx), "no valid type found:\n" + prettyPrintLezerNode(node, ctx.sourceCode));
}
function processDeclarator(ctx, node, rootmostType) {
  if (node.name === "FunctionDefinition" || node.name === "ParameterDeclaration") {
    rootmostType ??= processRootmostType(ctx, node);
  } else {
    if (!rootmostType)
      throwError(
        nodePosition(node, ctx),
        "no rootmost type provided to declarator:\n" + prettyPrintLezerNode(node, ctx.sourceCode)
      );
  }
  const children = getChildren2(node);
  const declarators = children.filter((child) => child.name.endsWith("Declarator") || child.name === "Identifier");
  if (declarators.length !== 1) {
    throwError(
      nodePosition(node, ctx),
      "no or multiple declarators found:\n" + prettyPrintLezerNode(node, ctx.sourceCode)
    );
  }
  const declarator = declarators[0];
  if (declarator?.name === "PointerDeclarator") {
    if (!rootmostType) throwError(nodePosition(declarator, ctx), "no rootmost type provided to PointerDeclarator");
    const isConst = !!declarator.parent?.getChild("const") || rootmostType.type === "fn";
    const parentAttributes = declarator.parent?.getChildren("Attribute") ?? [];
    const isNonNull = parentAttributes.some((attr) => text(attr.getChild("AttributeName"), ctx) === "ZIG_NONNULL");
    return processDeclarator(ctx, declarator, {
      type: "pointer",
      child: rootmostType,
      position: nodePosition(declarator, ctx),
      isConst,
      isNonNull,
      isMany: false
    });
  } else if (declarator?.name === "ReferenceDeclarator") {
    throwError(nodePosition(declarator, ctx), "references are not allowed");
  } else if (declarator?.name === "FunctionDeclarator" && !declarator.getChild("Identifier")) {
    const lhs = declarator.getChild("ParenthesizedDeclarator");
    const rhs = declarator.getChild("ParameterList");
    if (!lhs || !rhs) {
      throwError(
        nodePosition(declarator, ctx),
        "FunctionDeclarator has neither Identifier nor ParenthesizedDeclarator:\n" + prettyPrintLezerNode(declarator, ctx.sourceCode)
      );
    }
    const fnType = {
      type: "fn",
      parameters: [],
      returnType: rootmostType,
      position: nodePosition(declarator, ctx)
    };
    for (const arg of rhs.getChildren("ParameterDeclaration")) {
      const paramDeclarator = processDeclarator(ctx, arg);
      fnType.parameters.push({ type: paramDeclarator.type, name: text(paramDeclarator.final, ctx) });
    }
    return processDeclarator(ctx, lhs, fnType);
  }
  return { type: rootmostType, final: declarator };
}
function processFunction(ctx, node, tag) {
  const declarator = processDeclarator(ctx, node);
  const final = declarator.final;
  if (final.name !== "FunctionDeclarator") {
    throwError(nodePosition(final, ctx), "not a function_declarator: " + final.name);
  }
  const nameNode = final.getChild("Identifier");
  if (!nameNode) throwError(nodePosition(final, ctx), "no name found:\n" + prettyPrintLezerNode(final, ctx.sourceCode));
  const parameterList = final.getChild("ParameterList");
  if (!parameterList) throwError(nodePosition(final, ctx), "no parameter list found");
  const parameters = [];
  for (const parameter of parameterList.getChildren("ParameterDeclaration")) {
    const paramDeclarator = processDeclarator(ctx, parameter);
    const name2 = paramDeclarator.final;
    if (name2.name !== "Identifier") {
      throwError(nodePosition(name2, ctx), "parameter name is not an identifier: " + name2.name);
    }
    parameters.push({ type: paramDeclarator.type, name: text(name2, ctx) });
  }
  for (let i = 0; i < parameters.length; i++) {
    const param = parameters[i];
    const next = parameters[i + 1];
    if (param.type.type === "pointer" && next?.type.type === "named" && next.type.name === "size_t") {
      param.type.isMany = true;
      i++;
    }
  }
  return {
    returnType: declarator.type,
    name: text(nameNode, ctx),
    parameters,
    position: nodePosition(nameNode, ctx),
    tag
  };
}
var sharedTypesText = fs.readFileSync("src/codegen/shared-types.ts", "utf-8");
var sharedTypesLines = sharedTypesText.split("\n");
var sharedTypesLine = 0;
var sharedTypesColumn = 0;
var sharedTypesColumnEnd = 0;
for (const line of sharedTypesLines) {
  sharedTypesLine++;
  if (line.includes("export const sharedTypes")) {
    sharedTypesColumn = line.indexOf("sharedTypes") + 1;
    sharedTypesColumnEnd = sharedTypesColumn + "sharedTypes".length;
    break;
  }
}
var errorsForTypes = /* @__PURE__ */ new Map();
function generateZigType(type, parent) {
  if (type.type === "pointer") {
    const optionalChar = type.isNonNull ? "" : "?";
    const ptrChar = type.isMany ? "[*]" : "*";
    const constChar = type.isConst ? "const " : "";
    return `${optionalChar}${ptrChar}${constChar}${generateZigType(type.child, type)}`;
  }
  if (type.type === "fn") {
    return `fn(${type.parameters.map((p) => formatZigName(p.name) + ": " + generateZigType(p.type, null)).join(", ")}) callconv(.c) ${generateZigType(type.returnType, null)}`;
  }
  if (type.type === "named" && type.name === "void") {
    if (parent?.type === "pointer") return "anyopaque";
    if (!parent) return "void";
    throwError(type.position, "void must have a pointer parent or no parent");
  }
  if (type.type === "named") {
    const bannedType = bannedTypes2[type.name];
    if (bannedType) {
      appendError(type.position, bannedType);
      return "anyopaque";
    }
    const sharedType = sharedTypes2[type.name];
    if (sharedType) return sharedType;
    const error = errorsForTypes.has(type.name) ? errorsForTypes.get(type.name) : appendError(
      {
        file: "src/codegen/shared-types.ts",
        start: { line: sharedTypesLine, column: sharedTypesColumn },
        end: { line: sharedTypesLine, column: sharedTypesColumnEnd }
      },
      "sharedTypes is missing type: " + JSON.stringify(type.name)
    );
    errorsForTypes.set(type.name, error);
    error.notes.push({ position: type.position, message: "used in exported function here" });
    return "anyopaque";
  }
  assertNever(type);
}
function formatZigName(name2) {
  if (name2.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) return name2;
  return "@" + JSON.stringify(name2);
}
function generateZigParameterList(parameters, globalThisArg) {
  return parameters.map((p) => {
    if (p === globalThisArg) {
      return `${formatZigName(p.name)}: *jsc.JSGlobalObject`;
    } else {
      return `${formatZigName(p.name)}: ${generateZigType(p.type, null)}`;
    }
  }).join(", ");
}
function generateZigSourceComment(cfg, resultSourceLinks, fn) {
  const fileName = relative(cfg.dstDir, fn.position.file);
  resultSourceLinks.push(`${fn.name}:${fileName}:${fn.position.start.line}:${fn.position.start.column}`);
  return `/// Source: ${fn.name}`;
}
async function processFile(parser2, file, allFunctions) {
  const sourceCode = fs.readFileSync(file, "utf-8");
  if (!sourceCode.includes("[[ZIG_EXPORT(")) return;
  const sourceCodeLines = sourceCode.split("\n");
  const manualFindLines = /* @__PURE__ */ new Set();
  for (let i = 0; i < sourceCodeLines.length; i++) {
    if (sourceCodeLines[i].includes("[[ZIG_EXPORT(")) {
      manualFindLines.add(i + 1);
    }
  }
  const tree = parser2.parse(sourceCode);
  const lineInfo = new LineInfo(sourceCode);
  const ctx = { file, sourceCode, lineInfo };
  if (!tree) {
    appendError({ file, start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }, "no tree found");
    for (const lineNumber of manualFindLines) {
      const lineContent = sourceCodeLines[lineNumber - 1];
      const column = lineContent.indexOf("[[ZIG_EXPORT(") + 3;
      appendError(
        {
          file,
          start: { line: lineNumber, column },
          end: { line: lineNumber, column: column + "ZIG_EXPORT(".length }
        },
        "ZIG_EXPORT found, but Lezer failed to parse the file."
      );
    }
    return;
  }
  const queryFoundLines = /* @__PURE__ */ new Set();
  tree.iterate({
    enter: (nodeRef) => {
      if (nodeRef.name !== "FunctionDefinition") {
        return true;
      }
      const fnNode = nodeRef.node;
      let zigExportAttr = null;
      let tagIdentifier = null;
      for (const attr of fnNode.getChildren("Attribute")) {
        const attrNameNode = attr.getChild("AttributeName");
        if (attrNameNode && text(attrNameNode, ctx) === "ZIG_EXPORT") {
          zigExportAttr = attr;
          const args = attr.getChild("AttributeArgs");
          if (args) {
            tagIdentifier = args.getChild("Identifier");
          }
          break;
        }
      }
      if (!zigExportAttr || !tagIdentifier) {
        return false;
      }
      queryFoundLines.add(lineInfo.get(zigExportAttr.from).line);
      const tagStr = text(tagIdentifier, ctx);
      let tag;
      if (tagStr === "nothrow" || tagStr === "zero_is_throw" || tagStr === "check_slow" || tagStr === "false_is_throw" || tagStr === "null_is_throw") {
        tag = tagStr;
      } else if (tagStr === "print") {
        console.log(prettyPrintLezerNode(fnNode, ctx.sourceCode));
        appendError(nodePosition(tagIdentifier, ctx), "'print' tags are only for debugging cppbind");
        tag = "nothrow";
      } else {
        appendError(
          nodePosition(tagIdentifier, ctx),
          "tag must be nothrow, zero_is_throw, check_slow, false_is_throw, or null_is_throw: " + tagStr
        );
        tag = "nothrow";
      }
      try {
        const result = processFunction(ctx, fnNode, tag);
        allFunctions.push(result);
      } catch (e) {
        appendErrorFromCatch(e, nodePosition(fnNode, ctx));
      }
      return false;
    }
  });
  for (const lineNumber of manualFindLines) {
    if (!queryFoundLines.has(lineNumber)) {
      const lineContent = sourceCodeLines[lineNumber - 1];
      const column = lineContent.indexOf("[[ZIG_EXPORT(") + 3;
      const position = {
        file,
        start: { line: lineNumber, column },
        end: { line: lineNumber, column: column + "ZIG_EXPORT(".length }
      };
      appendError(
        position,
        "ZIG_EXPORT was found on this line, but the Lezer parser did not find a valid C++ attribute on a function definition. Ensure it's in the form `[[ZIG_EXPORT(tag)]]` before a function definition."
      );
    }
  }
}
async function renderError(position, message, label, color) {
  const fileContent = fs.readFileSync(position.file, "utf-8");
  const lines = fileContent.split("\n");
  const line = lines[position.start.line - 1];
  if (line === void 0) return;
  console.error(
    `\x1B[m${position.file}:${position.start.line}:${position.start.column}: ${color}\x1B[1m${label}:\x1B[m ${message}`
  );
  const before = `${position.start.line} |   ${line.substring(0, position.start.column - 1)}`;
  const after = line.substring(position.start.column - 1);
  console.error(`\x1B[90m${before}${after}\x1B[m`);
  let length = position.start.line === position.end.line ? position.end.column - position.start.column : 1;
  console.error(`\x1B[m${" ".repeat(Bun.stringWidth(before))}${color}^${"~".repeat(Math.max(length - 1, 0))}\x1B[m`);
}
function generateZigFn(fn, resultRaw, resultBindings, resultSourceLinks, cfg) {
  let returnType = generateZigType(fn.returnType, null);
  if (resultBindings.length) resultBindings.push("");
  resultBindings.push(generateZigSourceComment(cfg, resultSourceLinks, fn));
  if (fn.tag === "nothrow") {
    resultBindings.push(
      `pub extern fn ${formatZigName(fn.name)}(${generateZigParameterList(fn.parameters)}) ${returnType};`
    );
    return;
  }
  resultRaw.push(`    extern fn ${formatZigName(fn.name)}(${generateZigParameterList(fn.parameters)}) ${returnType};`);
  let globalThisArg;
  for (const param of fn.parameters) {
    const type = generateZigType(param.type, null);
    if (type === "?*jsc.JSGlobalObject") {
      globalThisArg = param;
      break;
    }
  }
  if (!globalThisArg) throwError(fn.position, "no globalThis argument found (required for " + fn.tag + ")");
  if (fn.tag === "check_slow") {
    if (returnType === "jsc.JSValue") {
      appendError(
        fn.position,
        "Use ZIG_EXPORT(zero_is_throw) instead of ZIG_EXPORT(check_slow) for functions that return JSValue"
      );
    }
    resultBindings.push(
      `pub fn ${formatZigName(fn.name)}(${generateZigParameterList(fn.parameters, globalThisArg)}) error{JSError}!${returnType} {`,
      `    if (comptime Environment.ci_assert) {`,
      `        var scope: jsc.TopExceptionScope = undefined;`,
      `        scope.init(${formatZigName(globalThisArg.name)}, @src());`,
      `        defer scope.deinit();`,
      ``,
      `        const result = raw.${formatZigName(fn.name)}(${fn.parameters.map((p) => formatZigName(p.name)).join(", ")});`,
      `        try scope.returnIfException();`,
      `        return result;`,
      `    } else {`,
      `        const result = raw.${formatZigName(fn.name)}(${fn.parameters.map((p) => formatZigName(p.name)).join(", ")});`,
      `        if (Bun__RETURN_IF_EXCEPTION(${formatZigName(globalThisArg.name)})) return error.JSError;`,
      `        return result;`,
      `    }`,
      `}`
    );
    return;
  }
  let equalsValue;
  if (fn.tag === "zero_is_throw") {
    equalsValue = ".zero";
    if (returnType !== "jsc.JSValue") {
      appendError(fn.position, "ZIG_EXPORT(zero_is_throw) is only allowed for functions that return JSValue");
    }
  } else if (fn.tag === "false_is_throw") {
    equalsValue = "false";
    if (returnType !== "bool") {
      appendError(fn.position, "ZIG_EXPORT(false_is_throw) is only allowed for functions that return bool");
    }
    returnType = "void";
  } else if (fn.tag === "null_is_throw") {
    equalsValue = "null";
    if (!returnType.startsWith("?*")) {
      appendError(fn.position, "ZIG_EXPORT(null_is_throw) is only allowed for functions that return optional pointer");
    }
    returnType = returnType.slice(1);
  } else assertNever(fn.tag);
  resultBindings.push(
    `pub fn ${formatZigName(fn.name)}(${generateZigParameterList(fn.parameters, globalThisArg)}) error{JSError}!${returnType} {`,
    `    if (comptime Environment.ci_assert) {`,
    `        var scope: jsc.ExceptionValidationScope = undefined;`,
    `        scope.init(${formatZigName(globalThisArg.name)}, @src());`,
    `        defer scope.deinit();`,
    ``,
    `        const value = raw.${formatZigName(fn.name)}(${fn.parameters.map((p) => formatZigName(p.name)).join(", ")});`,
    `        scope.assertExceptionPresenceMatches(value == ${equalsValue});`,
    `        return if (value == ${equalsValue}) error.JSError ${fn.tag === "false_is_throw" ? "" : "else value"}${fn.tag === "null_is_throw" ? ".?" : ""};`,
    `    } else {`,
    `        const value = raw.${formatZigName(fn.name)}(${fn.parameters.map((p) => formatZigName(p.name)).join(", ")});`,
    `        if (value == ${equalsValue}) return error.JSError;`,
    ...fn.tag === "false_is_throw" ? [] : [`        return value${fn.tag === "null_is_throw" ? ".?" : ""};`],
    `    }`,
    `}`
  );
  return;
}
async function readFileOrEmpty(file) {
  try {
    const fileContents = fs.readFileSync(file, "utf-8");
    return fileContents;
  } catch (e) {
    return "";
  }
}
async function main() {
  const args = process.argv.slice(2);
  const dstDir = args[1];
  if (!dstDir) {
    console.error(
      String.raw`
                   _     _           _
                  | |   (_)         | |
   ___ _ __  _ __ | |__  _ _ __   __| |
  / __| '_ \| '_ \| '_ \| | '_ \ / _' |
 | (__| |_) | |_) | |_) | | | | | (_| |
  \___| .__/| .__/|_.__/|_|_| |_|\__,_|
      | |   | |
      |_|   |_|
`.slice(1)
    );
    console.error("Usage: bun src/codegen/cppbind src build/debug/codegen [cxx-sources.txt]");
    process.exit(1);
  }
  await mkdir(dstDir, { recursive: true });
  const parser2 = cppParser;
  const cxxSourcesPath = args[2];
  if (!cxxSourcesPath) {
    console.error("usage: cppbind.ts <codegen-dir> <output> <cxx-sources-file>");
    process.exit(1);
  }
  const allCppFiles = fs.readFileSync(cxxSourcesPath, "utf-8").trim().split("\n").map((q) => q.trim()).filter((q) => !!q).filter((q) => !q.startsWith("#"));
  const allFunctions = [];
  await Promise.all(allCppFiles.map((file) => processFile(parser2, file, allFunctions)));
  allFunctions.sort((a2, b) => a2.position.file < b.position.file ? -1 : a2.position.file > b.position.file ? 1 : 0);
  const resultRaw = [];
  const resultBindings = [];
  const resultSourceLinks = [];
  for (const fn of allFunctions) {
    try {
      generateZigFn(fn, resultRaw, resultBindings, resultSourceLinks, { dstDir });
    } catch (e) {
      appendErrorFromCatch(e, fn.position);
    }
  }
  for (const message of errors) {
    await renderError(message.position, message.message, "error", "\x1B[31m");
    for (const note of message.notes) {
      await renderError(note.position, note.message, "note", "\x1B[36m");
    }
    console.error();
  }
  const resultFilePath = join(dstDir, "cpp.zig");
  const resultContents = typeDeclarations2 + "\n" + resultBindings.join("\n") + "\n\nconst raw = struct {\n" + resultRaw.join("\n") + "\n};\n";
  if (await readFileOrEmpty(resultFilePath) !== resultContents) {
    await Bun.write(resultFilePath, resultContents);
  }
  const resultSourceLinksFilePath = join(dstDir, "cpp.source-links");
  const resultSourceLinksContents = resultSourceLinks.join("\n");
  if (await readFileOrEmpty(resultSourceLinksFilePath) !== resultSourceLinksContents) {
    await Bun.write(resultSourceLinksFilePath, resultSourceLinksContents);
    const now = Date.now();
    const sin = Math.round((Math.sin(now / 1e3 * 1) + 1) / 2 * 0);
    if (process.env.CI) {
      console.log(
        " ".repeat(sin) + (errors.length > 0 ? "\u2717" : "\u2713") + " cppbind.ts generated bindings to " + resultFilePath + (errors.length > 0 ? " with errors" : "") + " in " + (now - start) + "ms"
      );
    }
  }
  if (errors.length > 0) {
    process.exit(1);
  }
}
await main();
export {
  prettyPrintLezerNode
};
