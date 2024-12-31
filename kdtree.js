"use strict";
function arePointsEqual(p1, p2) {
    return p1.length === p2.length && p1.every((val, i) => val === p2[i]);
}
class KDTree {
    constructor(k, points) {
        this.root = null;
        k = Math.max(k, 0);
        this.dimension = k;
        if (points)
            this.root = this.build(points, 0);
    }
    build(points, depth) {
        if (points.length === 0)
            return null;
        const axis = depth % this.dimension; // Cycle through axes
        points.sort((a, b) => a[axis] - b[axis]); // Sort by current axis
        const medianIdx = Math.floor(points.length / 2);
        return {
            point: points[medianIdx],
            left: this.build(points.slice(0, medianIdx), depth + 1),
            right: this.build(points.slice(medianIdx + 1), depth + 1),
            axis,
        };
    }
    insert_proto(V, point, depth = 0) {
        const axis = depth % this.dimension;
        if (V === null) {
            return { point, left: null, right: null, axis };
        }
        if (point[axis] < V.point[axis]) {
            V.left = this.insert_proto(V.left, point, depth + 1);
        }
        else {
            V.right = this.insert_proto(V.right, point, depth + 1);
        }
        return V;
    }
    findMin_proto(V, axis, depth = 0) {
        if (!V)
            return null;
        const currentAxis = depth % this.dimension;
        if (axis === currentAxis) {
            if (V.left === null)
                return V;
            return this.findMin_proto(V.left, axis, depth + 1);
        }
        const leftMin = this.findMin_proto(V.left, axis, depth + 1);
        const rightMin = this.findMin_proto(V.right, axis, depth + 1);
        let minV = V;
        if (leftMin && leftMin.point[axis] < minV.point[axis])
            minV = leftMin;
        if (rightMin && rightMin.point[axis] < minV.point[axis])
            minV = rightMin;
        return minV;
    }
    findMax_proto(V, axis, depth = 0) {
        if (!V)
            return null;
        const currentAxis = depth % this.dimension;
        if (axis === currentAxis) {
            if (V.right === null)
                return V;
            return this.findMax_proto(V.right, axis, depth + 1);
        }
        const leftMax = this.findMax_proto(V.left, axis, depth + 1);
        const rightMax = this.findMax_proto(V.right, axis, depth + 1);
        let maxV = V;
        if (leftMax && leftMax.point[axis] > maxV.point[axis])
            maxV = leftMax;
        if (rightMax && rightMax.point[axis] > maxV.point[axis])
            maxV = rightMax;
        return maxV;
    }
    deleteNode_proto(V, point, depth = 0) {
        if (!V)
            return null;
        const axis = depth % this.dimension;
        if (arePointsEqual(V.point, point)) {
            if (V.right) {
                const minNode = this.findMin_proto(V.right, axis);
                if (minNode) {
                    V.point = minNode.point;
                    V.right = this.deleteNode_proto(V.right, minNode.point, depth + 1);
                }
            }
            else if (V.left) {
                const minNode = this.findMin_proto(V.left, axis);
                if (minNode) {
                    V.point = minNode.point;
                    V.right = this.deleteNode_proto(V.left, minNode.point, depth + 1);
                    V.left = null; // Promote the subtree
                }
            }
            else {
                return null; // Leaf node, simply delete
            }
        }
        else if (point[axis] < V.point[axis]) {
            V.left = this.deleteNode_proto(V.left, point, depth + 1);
        }
        else {
            V.right = this.deleteNode_proto(V.right, point, depth + 1);
        }
        return V;
    }
    nearestNeighbors_proto(V, target, k, depth = 0, best = [], distanceFunc) {
        if (!V)
            return best;
        const axis = V.axis;
        const dist = distanceFunc(V.point, target);
        best.push({ point: V.point, dist });
        best.sort((a, b) => {
            if(a.dist < b.dist) return -1;
            else return 1;
        });
        if (best.length > k)
            best.pop(); // Keep only the k nearest neighbors
        let direction;
        let otherBranch;
        if (target[axis] < V.point[axis]) {
            direction = 'left';
            otherBranch = 'right';
        }
        else {
            direction = 'right';
            otherBranch = 'left';
        }
        best = this.nearestNeighbors_proto(V[direction], target, k, depth + 1, best, distanceFunc);
        if (best.length < k ||
            Math.abs(target[axis] - V.point[axis]) ** 2 < best[best.length - 1].dist) {
            best = this.nearestNeighbors_proto(V[otherBranch], target, k, depth + 1, best, distanceFunc);
        }
        return best;
    }
    insert(p) {
        this.root = this.insert_proto(this.root, p);
    }
    delete(p) {
        this.root = this.deleteNode_proto(this.root, p);
    }
    findMinAlongAxis(axis) {
        var _a;
        return (_a = this.findMin_proto(this.root, axis, 0)) === null || _a === void 0 ? void 0 : _a.point;
    }
    findMaxAlongAxis(axis) {
        var _a;
        return (_a = this.findMax_proto(this.root, axis, 0)) === null || _a === void 0 ? void 0 : _a.point;
    }
    findKNearestNeighbor(point, k, distanceFunc) {
        if (k <= 0)
            return [];
        return this.nearestNeighbors_proto(this.root, point, k, 0, [], distanceFunc);
    }
}
